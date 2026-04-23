import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Area } from '../../../../core/models/area.models';

@Component({
  selector: 'app-lane-assignment-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lane-assignment-panel.component.html',
  styleUrl: './lane-assignment-panel.component.css',
})
export class LaneAssignmentPanelComponent {
  @Input() selectedLaneName = 'Ninguna lane seleccionada';
  @Input() selectedLaneAreaLabel = 'Sin area asignada';
  @Input() selectedLaneAreaId = '';
  @Input() readonlyMode = false;
  @Input() isAreasLoading = false;
  @Input() hasSelectedLane = false;
  @Input() activeAreas: Area[] = [];
  @Input() laneBindingMessage = '';
  @Input() areasError = '';

  @Output() readonly areaChange = new EventEmitter<string>();
}
