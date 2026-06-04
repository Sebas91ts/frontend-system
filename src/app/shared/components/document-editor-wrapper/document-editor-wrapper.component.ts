import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, SimpleChanges, ViewChild, inject } from '@angular/core';
import { OnlyOfficeEditorConfig } from '../../../core/models/onlyoffice.models';
import { OnlyOfficeService } from '../../../core/services/onlyoffice.service';

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (elementId: string, config: Record<string, unknown>) => { destroyEditor?: () => void };
    };
  }
}

type OnlyOfficeEvent = {
  errorCode?: number;
  errorDescription?: string;
  warningCode?: number;
  warningDescription?: string;
  data?: unknown;
};

type SaveState = 'idle' | 'saving' | 'saved';

@Component({
  selector: 'app-document-editor-wrapper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-editor-wrapper.component.html',
  styleUrl: './document-editor-wrapper.component.css',
})
export class DocumentEditorWrapperComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) documentId!: string;
  @Input() height = '100vh';
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  protected loading = false;
  protected editorReady = false;
  protected error: string | null = null;
  protected config: OnlyOfficeEditorConfig | null = null;
  protected saveState: SaveState = 'idle';
  protected saveStateMessage = '';

  private readonly onlyOfficeService = inject(OnlyOfficeService);
  private readonly ngZone = inject(NgZone);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private editorInstance: { destroyEditor?: () => void } | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['documentId'] && this.documentId) {
      this.loadEditor();
    }
  }

  ngOnDestroy(): void {
    this.destroyEditor();
    if (this.documentId) {
      this.onlyOfficeService.finishEditing(this.documentId).subscribe({ error: () => undefined });
    }
  }

  private loadEditor(): void {
    this.loading = true;
    this.editorReady = false;
    this.error = null;
    this.setSaveState('idle');
    this.destroyEditor();
    this.onlyOfficeService.getEditorConfig(this.documentId).subscribe({
      next: (response) => {
        console.info('[OnlyOffice] editor-config response', response);
        this.config = response.data;
        if (!this.config?.onlyOfficeReady) {
          this.error = this.config?.message || 'OnlyOffice no esta habilitado.';
          this.loading = false;
          return;
        }
        this.ensureScript(this.config.documentServerUrl)
          .then(() => this.openEditor(this.config as OnlyOfficeEditorConfig))
          .catch(() => {
            this.error = 'No se pudo cargar DocsAPI de OnlyOffice.';
            this.loading = false;
          });
      },
      error: () => {
        this.error = 'No se pudo obtener la configuracion del editor.';
        this.loading = false;
      },
    });
  }

  private openEditor(config: OnlyOfficeEditorConfig): void {
    if (!window.DocsAPI?.DocEditor) {
      this.error = 'DocsAPI no esta disponible.';
      this.loading = false;
      return;
    }
    if (config.editable) {
      this.onlyOfficeService.startEditing(config.documentId).subscribe({ error: () => undefined });
    }
    this.editorHost.nativeElement.id = `onlyoffice-editor-${config.documentId}`;
    this.editorInstance = new window.DocsAPI.DocEditor(this.editorHost.nativeElement.id, this.withDiagnostics(config));
    this.markEditorReady();
  }

  private withDiagnostics(config: OnlyOfficeEditorConfig): Record<string, unknown> {
    return {
      ...config.docsApiConfig,
      events: {
        onAppReady: () => {
          console.info('[OnlyOffice] app ready', {
            documentId: config.documentId,
            documentKey: config.documentKey,
            mode: config.mode,
            editable: config.editable,
          });
          this.markEditorReady();
          if (config.editable) {
            this.setSaveState('saved');
          }
        },
        onDocumentReady: () => {
          console.info('[OnlyOffice] document ready', {
            documentId: config.documentId,
            documentKey: config.documentKey,
            mode: config.mode,
            editable: config.editable,
          });
          this.markEditorReady();
          if (config.editable) {
            this.setSaveState('saved');
          }
        },
        onDocumentStateChange: (event: OnlyOfficeEvent) => {
          console.info('[OnlyOffice] document state change', event);
          this.setSaveState(event.data === true ? 'saving' : 'saved');
        },
        onError: (event: OnlyOfficeEvent) => {
          console.error('[OnlyOffice] editor error', event);
        },
        onWarning: (event: OnlyOfficeEvent) => {
          console.warn('[OnlyOffice] editor warning', event);
        },
      },
    };
  }

  private setSaveState(state: SaveState): void {
    this.ngZone.run(() => {
      this.saveState = state;
      this.saveStateMessage = state === 'saving'
        ? 'Autoguardando...'
        : state === 'saved'
          ? '✓ Todos los cambios guardados'
          : '';
    });
  }

  private markEditorReady(): void {
    this.ngZone.run(() => {
      this.editorReady = true;
      this.loading = false;
      this.changeDetectorRef.detectChanges();
    });
  }

  private ensureScript(documentServerUrl: string): Promise<void> {
    const scriptId = 'onlyoffice-docsapi-script';
    if (document.getElementById(scriptId)) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `${documentServerUrl.replace(/\/$/, '')}/web-apps/apps/api/documents/api.js`;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
  }

  private destroyEditor(): void {
    if (this.editorInstance?.destroyEditor) {
      this.editorInstance.destroyEditor();
    }
    this.editorInstance = null;
  }
}
