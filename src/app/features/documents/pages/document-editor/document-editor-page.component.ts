import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DocumentEditorWrapperComponent } from '../../../../shared/components/document-editor-wrapper/document-editor-wrapper.component';

@Component({
  selector: 'app-document-editor-page',
  standalone: true,
  imports: [CommonModule, DocumentEditorWrapperComponent],
  templateUrl: './document-editor-page.component.html',
  styleUrl: './document-editor-page.component.css',
})
export class DocumentEditorPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly documentId = this.route.snapshot.paramMap.get('documentId') || '';
}
