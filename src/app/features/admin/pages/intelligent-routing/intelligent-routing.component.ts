import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AiRoutingAnomaly, AiRoutingDashboardResponse } from '../../../../core/models/enterprise-ai.models';
import { AiService } from '../../../../core/services/ai.service';

@Component({
  selector: 'app-intelligent-routing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intelligent-routing.component.html',
  styleUrl: './intelligent-routing.component.css',
})
export class IntelligentRoutingComponent implements OnInit {
  private readonly aiService = inject(AiService);
  private readonly router = inject(Router);

  protected isLoading = true;
  protected errorMessage = '';
  protected dashboard: AiRoutingDashboardResponse | null = null;
  protected isValidationScenario = false;

  ngOnInit(): void {
    this.loadDashboard();
  }

  protected get modelLabel(): string {
    const status = this.dashboard?.modelStatus ?? '';
    if (status.includes('tensorflow_model_loaded')) {
      return 'TensorFlow activo';
    }
    if (status.includes('tensorflow_available')) {
      return 'TensorFlow disponible, sin modelo entrenado';
    }
    return 'Fallback heurístico inteligente';
  }

  protected get modelHint(): string {
    const status = this.dashboard?.modelStatus ?? '';
    if (status.includes('tensorflow_model_loaded')) {
      return 'El motor está usando un modelo .keras para apoyar la predicción.';
    }
    if (status.includes('tensorflow_available')) {
      return 'TensorFlow está instalado. Cuando exista delay_risk_model.keras se cargará automáticamente.';
    }
    return 'El sistema predice con reglas explicables mientras no exista un modelo entrenado.';
  }

  protected get highRiskTasks(): Array<Record<string, unknown>> {
    return this.dashboard?.highRiskTasks ?? [];
  }

  protected get highRiskInstances(): Array<Record<string, unknown>> {
    return this.dashboard?.highRiskInstances ?? [];
  }

  protected get anomalies(): AiRoutingAnomaly[] {
    return this.dashboard?.anomalies ?? [];
  }

  protected get recommendations(): string[] {
    return this.dashboard?.recommendations ?? [];
  }

  protected riskPercent(item: Record<string, unknown>): number {
    const value = Number(item['riskScore'] ?? 0);
    return Math.round(Math.max(0, Math.min(1, value)) * 100);
  }

  protected riskTone(item: Record<string, unknown>): string {
    const risk = this.riskPercent(item);
    if (risk >= 75) {
      return 'critico';
    }
    if (risk >= 50) {
      return 'alto';
    }
    return 'medio';
  }

  protected itemText(item: Record<string, unknown>, keys: string[], fallback = 'Sin datos'): string {
    for (const key of keys) {
      const value = item[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value);
      }
    }
    return fallback;
  }

  protected shortId(value: unknown): string {
    const text = String(value ?? '').trim();
    if (!text) {
      return 'N/D';
    }
    return text.length > 16 ? `${text.slice(0, 10)}...${text.slice(-4)}` : text;
  }

  protected goBack(): void {
    void this.router.navigate(['/admin']);
  }

  protected refresh(): void {
    this.loadDashboard();
  }

  protected loadValidationScenario(): void {
    this.isLoading = false;
    this.errorMessage = '';
    this.isValidationScenario = true;
    this.dashboard = {
      modelStatus: 'tensorflow_model_loaded_validation_dataset',
      highRiskTasks: [
        {
          id: 'task-validacion-001',
          name: 'Revisar contrato comercial',
          processInstanceId: 'instancia-demo-contrato-8842',
          areaName: 'Legal',
          areaId: 'legal',
          riskScore: 0.88,
          riskLevel: 'HIGH',
          status: 'Pendiente',
        },
        {
          id: 'task-validacion-002',
          name: 'Aprobar documentación financiera',
          processInstanceId: 'instancia-demo-finanzas-4410',
          areaName: 'Contabilidad',
          areaId: 'contabilidad',
          riskScore: 0.73,
          riskLevel: 'MEDIUM',
          status: 'Pendiente',
        },
        {
          id: 'task-validacion-003',
          name: 'Completar datos del solicitante',
          processInstanceId: 'instancia-demo-cliente-1108',
          areaName: 'Atención al Cliente',
          areaId: 'atencion-cliente',
          riskScore: 0.66,
          riskLevel: 'MEDIUM',
          status: 'En espera',
        },
      ],
      highRiskInstances: [
        {
          id: 'instancia-demo-contrato-8842',
          name: 'Solicitud de contrato empresarial',
          processKey: 'solicitud_contrato_empresarial',
          status: 'Activa',
          riskScore: 0.82,
          riskLevel: 'HIGH',
        },
        {
          id: 'instancia-demo-finanzas-4410',
          name: 'Registro de proveedor',
          processKey: 'registro_proveedor',
          status: 'Activa',
          riskScore: 0.71,
          riskLevel: 'MEDIUM',
        },
      ],
      anomalies: [
        {
          type: 'TASK_DELAY_ANOMALY',
          severity: 'HIGH',
          score: 0.91,
          description: 'La tarea Revisar contrato comercial supera ampliamente el tiempo histórico del área Legal.',
          entityId: 'task-validacion-001',
        },
        {
          type: 'DOCUMENT_BLOCKER',
          severity: 'MEDIUM',
          score: 0.78,
          description: 'Existen documentos obligatorios pendientes en una instancia activa.',
          entityId: 'instancia-demo-finanzas-4410',
        },
      ],
      recommendations: [
        'Priorizar la revisión legal del contrato comercial por riesgo alto de demora.',
        'Reasignar aprobación financiera a un usuario con menor carga operativa.',
        'Solicitar documentos obligatorios antes de continuar la instancia de proveedor.',
      ],
    };
  }

  private loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.isValidationScenario = false;
    this.aiService.obtenerDashboardEnrutamiento()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          this.dashboard = response.data ?? null;
        },
        error: (error) => {
          this.dashboard = null;
          this.errorMessage = error?.error?.message || 'No se pudo cargar el motor inteligente.';
        },
      });
  }
}
