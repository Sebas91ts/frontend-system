import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild, inject } from '@angular/core';
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
  protected error: string | null = null;
  protected config: OnlyOfficeEditorConfig | null = null;

  private readonly onlyOfficeService = inject(OnlyOfficeService);
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
    this.error = null;
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
    this.loading = false;
  }

  private withDiagnostics(config: OnlyOfficeEditorConfig): Record<string, unknown> {
    return {
      ...config.docsApiConfig,
      events: {
        onDocumentReady: () => {
          console.info('[OnlyOffice] document ready', {
            documentId: config.documentId,
            documentKey: config.documentKey,
            mode: config.mode,
            editable: config.editable,
          });
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
