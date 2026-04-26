import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Proceso } from '../../../../core/models/process.models';
import { AuthService } from '../../../../core/services/auth.service';
import { ProcessService } from '../../../../core/services/process.service';

interface StartableProcessCard {
  id: string;
  processKey: string;
  name: string;
  version: number;
  areaLabel: string;
  xml: string;
}

@Component({
  selector: 'app-process-startable-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-startable-list.component.html',
  styleUrl: './process-startable-list.component.css',
})
export class ProcessStartableListComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly processService = inject(ProcessService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly user = computed(() => this.authService.currentUser());
  protected processes: StartableProcessCard[] = [];
  protected isLoading = false;
  protected errorMessage = '';
  protected startingId: string | null = null;
  protected confirmProcess: StartableProcessCard | null = null;

  ngOnInit(): void {
    this.loadProcesses();
  }

  ngOnDestroy(): void {}

  protected goBack(): void {
    void this.router.navigate(['/user']);
  }

  protected trackProcess(_: number, process: StartableProcessCard): string {
    return process.id || process.processKey;
  }

  protected openStartConfirm(process: StartableProcessCard): void {
    this.confirmProcess = process;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  protected closeStartConfirm(): void {
    if (this.startingId) {
      return;
    }

    this.confirmProcess = null;
  }

  protected confirmAndStartProcess(): void {
    if (!this.confirmProcess) {
      return;
    }

    const process = this.confirmProcess;
    if (this.startingId || !process.processKey) {
      return;
    }

    this.startingId = process.id;
    this.errorMessage = '';
    this.confirmProcess = null;
    this.cdr.detectChanges();

    this.processService
      .iniciarProceso(process.processKey)
      .pipe(
        finalize(() => {
          this.startingId = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          const instanceId =
            (response.data as any)?.processInstanceId ||
            (response.data as any)?.id ||
            (response.data as any)?.instanceId;

          if (instanceId) {
            void this.router.navigate(['/tasks'], { queryParams: { mode: 'mine', instanceId } });
            return;
          }

          this.errorMessage = response.message || 'Instancia iniciada correctamente.';
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message || 'No se pudo iniciar la instancia.';
          this.cdr.detectChanges();
        },
      });
  }

  private loadProcesses(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.processService
      .listarProcesosPublicados()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.processes = this.filterStartableProcesses(response.data ?? []);
        },
        error: (error: any) => {
          this.processes = [];
          this.errorMessage = error?.error?.message || 'No se pudieron cargar los procesos disponibles.';
        },
      });
  }

  private filterStartableProcesses(processes: Proceso[]): StartableProcessCard[] {
    const areaId = this.user()?.areaId?.trim();
    if (!areaId) {
      return [];
    }

    return processes
      .filter((process) => this.canUserStartProcess(process.xml, areaId))
      .map((process) => ({
        id: process.id,
        processKey: process.processKey,
        name: process.nombre,
        version: process.version ?? 1,
        areaLabel: this.getProcessAreaLabel(process.xml) || this.user()?.areaNombre || 'Tu área',
        xml: process.xml,
      }));
  }

  private canUserStartProcess(xml: string, userAreaId: string): boolean {
    const document = this.parseXml(xml);
    if (!document) {
      return false;
    }

    const firstTaskId = this.extractFirstTaskId(document);
    if (!firstTaskId) {
      return false;
    }

    return this.resolveTaskAreaId(document, firstTaskId) === userAreaId;
  }

  private extractFirstTaskId(document: Document): string | null {
    const startEvent = document.querySelector('bpmn\\:startEvent, startEvent');
    const outgoingId = startEvent?.querySelector('bpmn\\:outgoing, outgoing')?.textContent?.trim();
    if (!outgoingId) {
      return null;
    }

    const sequenceFlows = Array.from(document.querySelectorAll('bpmn\\:sequenceFlow, sequenceFlow'));
    const firstFlow = sequenceFlows.find((flow) => flow.getAttribute('id') === outgoingId);
    return firstFlow?.getAttribute('targetRef')?.trim() || null;
  }

  private resolveTaskAreaId(document: Document, taskId: string): string | null {
    const lane = Array.from(document.querySelectorAll('bpmn\\:lane, lane')).find((laneElement) =>
      Array.from(laneElement.querySelectorAll('bpmn\\:flowNodeRef, flowNodeRef')).some(
        (ref) => ref.textContent?.trim() === taskId,
      ),
    );

    const areaRef = lane?.querySelector('custom\\:areaRef, areaRef')?.textContent?.trim();
    return areaRef || null;
  }

  private getProcessAreaLabel(xml: string): string {
    const document = this.parseXml(xml);
    if (!document) {
      return '';
    }

    const firstTaskId = this.extractFirstTaskId(document);
    if (!firstTaskId) {
      return '';
    }

    const lane = Array.from(document.querySelectorAll('bpmn\\:lane, lane')).find((laneElement) =>
      Array.from(laneElement.querySelectorAll('bpmn\\:flowNodeRef, flowNodeRef')).some(
        (ref) => ref.textContent?.trim() === firstTaskId,
      ),
    );

    return lane?.getAttribute('name')?.trim() || '';
  }

  private parseXml(xml: string): Document | null {
    try {
      return new DOMParser().parseFromString(xml, 'application/xml');
    } catch {
      return null;
    }
  }
}
