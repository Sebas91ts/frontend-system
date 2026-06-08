import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { DocumentLifecycleState, DocumentMetadata } from '../../../../core/models/document-lifecycle.models';
import { FolderTreeNode } from '../../../../core/models/folder.models';
import { Tag } from '../../../../core/models/tag.models';
import { Area } from '../../../../core/models/area.models';
import { DocumentRepositoryService } from '../../../../core/services/document-repository.service';
import { DocumentSearchService } from '../../../../core/services/document-search.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FolderService } from '../../../../core/services/folder.service';
import { TagService } from '../../../../core/services/tag.service';
import { AreaService } from '../../../../core/services/area.service';

type SortDirection = 'ASC' | 'DESC';
type NavigationMode = 'processes' | 'folders';

type ProcessGroup = {
  tenantId: string;
  processInstanceId: string;
  processKey?: string;
  sampleDocumentName?: string;
  count: number;
  latest?: string;
};

type AreaFolderGroup = {
  tenantId: string;
  folders: FolderTreeNode[];
};

@Component({
  selector: 'app-document-repository',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './document-repository.component.html',
  styleUrl: './document-repository.component.css',
})
export class DocumentRepositoryComponent implements OnInit {
  protected documents: DocumentMetadata[] = [];
  protected repositoryIndexDocuments: DocumentMetadata[] = [];
  protected folderTree: FolderTreeNode[] = [];
  protected tags: Tag[] = [];
  protected areas: Area[] = [];
  protected selectedDocument: DocumentMetadata | null = null;
  protected navigationMode: NavigationMode = 'folders';
  protected selectedAreaId = '';
  protected selectedProcessInstanceId = '';
  protected areaOptions: string[] = [];
  protected selectedFolderId = '';
  protected searchTerm = '';
  protected selectedTagId = '';
  protected selectedState: DocumentLifecycleState | '' = '';
  protected selectedMimeType = '';
  protected sortBy = 'updatedAt';
  protected sortDirection: SortDirection = 'DESC';
  protected loading = false;
  protected foldersLoading = false;
  protected tagsLoading = false;
  protected errorMessage = '';
  protected feedbackMessage = '';
  protected page = 0;
  protected size = 25;
  protected totalElements = 0;
  protected totalPages = 0;

  protected readonly states: Array<DocumentLifecycleState | ''> = [
    '',
    'UPLOADED',
    'IN_REVIEW',
    'APPROVED',
    'REJECTED',
    'FINAL',
    'ARCHIVED',
  ];

  protected readonly mimeTypes = [
    { label: 'Todos los tipos', value: '' },
    { label: 'Word', value: 'word' },
    { label: 'PDF', value: 'pdf' },
    { label: 'Imagenes', value: 'image' },
    { label: 'Excel', value: 'sheet' },
  ];

  protected get editableCount(): number {
    return this.documents.filter((document) => this.isEditable(document)).length;
  }

  protected get inReviewCount(): number {
    return this.documents.filter((document) => document.documentState === 'IN_REVIEW').length;
  }

  protected get visibleDocuments(): DocumentMetadata[] {
    return this.documents.filter((document) => {
      const matchesProcess = !this.selectedProcessInstanceId || document.processInstanceId === this.selectedProcessInstanceId;
      const matchesFolder = !this.selectedFolderId || document.folderId === this.selectedFolderId;
      return matchesProcess && matchesFolder;
    });
  }

  protected get shouldShowDocuments(): boolean {
    return this.navigationMode === 'folders'
      ? !!this.selectedFolderId || !!this.selectedProcessInstanceId
      : !!this.selectedProcessInstanceId;
  }

  constructor(
    private readonly documentSearchService: DocumentSearchService,
    private readonly documentRepositoryService: DocumentRepositoryService,
    private readonly authService: AuthService,
    private readonly folderService: FolderService,
    private readonly tagService: TagService,
    private readonly areaService: AreaService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadAreas();
    this.loadFolders();
    this.loadTags();
    this.loadAreaOptions();
    this.loadRepository();
  }

  protected loadRepository(resetPage = false): void {
    if (resetPage) {
      this.page = 0;
    }
    this.loading = true;
    this.errorMessage = '';
    this.documentSearchService
      .search({
        tenantId: this.isAdmin() ? this.selectedAreaId || undefined : undefined,
        processInstanceId: this.selectedProcessInstanceId || undefined,
        folderId: this.selectedFolderId || undefined,
        tagId: this.selectedTagId || undefined,
        documentState: this.selectedState || undefined,
        mimeType: this.resolveMimeFilter(),
        originalName: this.searchTerm.trim() || undefined,
        page: this.page,
        size: this.size,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          const data = response.data;
          this.documents = data?.content ?? [];
          this.totalElements = data?.totalElements ?? this.documents.length;
          this.totalPages = data?.totalPages ?? 1;
          this.selectedDocument = this.shouldShowDocuments
            ? this.visibleDocuments.find((item) => item.id === this.selectedDocument?.id) ?? this.visibleDocuments[0] ?? null
            : null;
        },
        error: (error) => {
          console.error('[DocumentRepository] search failed', error);
          this.errorMessage = 'No pudimos cargar el repositorio documental. Revisa la conexion o intenta nuevamente.';
          this.documents = [];
          this.selectedDocument = null;
        },
      });
  }

  protected loadRepositoryIndex(): void {
    this.documentSearchService
      .search({
        tenantId: this.isAdmin() ? this.selectedAreaId || undefined : undefined,
        page: 0,
        size: 100,
        sortBy: 'updatedAt',
        sortDirection: 'DESC',
      })
      .subscribe({
        next: (response) => {
          this.repositoryIndexDocuments = response.data?.content ?? [];
          if (this.isAdmin()) {
            this.areaOptions = Array.from(new Set(this.repositoryIndexDocuments.map((document) => document.tenantId).filter(Boolean))).sort();
          }
        },
        error: (error) => {
          console.error('[DocumentRepository] repository index failed', error);
          this.repositoryIndexDocuments = [];
        },
      });
  }

  protected loadFolders(): void {
    this.foldersLoading = true;
    this.folderService
      .tree()
      .pipe(finalize(() => (this.foldersLoading = false)))
      .subscribe({
        next: (response) => {
          this.folderTree = response.data ?? [];
        },
        error: (error) => {
          console.error('[DocumentRepository] folder tree failed', error);
          this.folderTree = [];
        },
      });
  }

  protected loadAreaOptions(): void {
    if (!this.isAdmin()) {
      const areaId = this.currentUserAreaId();
      this.areaOptions = areaId ? [areaId] : [];
      this.loadRepositoryIndex();
      return;
    }
    this.loadRepositoryIndex();
  }

  protected loadTags(): void {
    this.tagsLoading = true;
    this.tagService
      .list()
      .pipe(finalize(() => (this.tagsLoading = false)))
      .subscribe({
        next: (response) => {
          this.tags = (response.data ?? []).filter((tag) => tag.active !== false);
        },
        error: (error) => {
          console.error('[DocumentRepository] tags failed', error);
          this.tags = [];
        },
      });
  }

  protected loadAreas(): void {
    this.areaService.listarAreas().subscribe({
      next: (response) => {
        this.areas = response.data ?? [];
      },
      error: (error) => {
        console.error('[DocumentRepository] areas failed', error);
        this.areas = [];
      },
    });
  }

  protected selectFolder(folderId: string): void {
    this.navigationMode = 'folders';
    this.selectedFolderId = folderId;
    this.selectedProcessInstanceId = '';
    this.loadRepository(true);
  }

  protected clearFolder(): void {
    this.selectedFolderId = '';
    this.selectedDocument = null;
    this.loadRepository(true);
  }

  protected clearNavigation(): void {
    this.selectedFolderId = '';
    this.selectedProcessInstanceId = '';
    this.selectedDocument = null;
    this.loadRepository(true);
  }

  protected selectArea(areaId: string): void {
    this.selectedAreaId = areaId;
    this.selectedProcessInstanceId = '';
    this.selectedFolderId = '';
    this.selectedDocument = null;
    this.loadRepositoryIndex();
    this.loadRepository(true);
  }

  protected setNavigationMode(mode: NavigationMode): void {
    this.navigationMode = mode;
    this.selectedFolderId = '';
    this.selectedProcessInstanceId = '';
    this.selectedDocument = null;
    this.loadRepository(true);
  }

  protected selectProcess(processInstanceId: string): void {
    this.navigationMode = 'processes';
    this.selectedProcessInstanceId = processInstanceId;
    this.selectedFolderId = '';
    this.loadRepository(true);
  }

  protected selectProcessFolder(processInstanceId: string): void {
    this.navigationMode = 'folders';
    this.selectedProcessInstanceId = processInstanceId;
    this.selectedFolderId = '';
    this.selectedDocument = null;
    this.loadRepository(true);
  }

  protected clearProcess(): void {
    this.selectedProcessInstanceId = '';
    this.selectedDocument = null;
    this.loadRepository(true);
  }

  protected selectDocument(document: DocumentMetadata): void {
    this.selectedDocument = document;
  }

  protected openEditor(document: DocumentMetadata): void {
    void this.router.navigate(['/documents', document.id, 'editor']);
  }

  protected download(document: DocumentMetadata): void {
    this.feedbackMessage = '';
    this.documentRepositoryService.getDownloadUrl(document.id).subscribe({
      next: (response) => {
        const url = response.data?.downloadUrl;
        if (!url) {
          this.feedbackMessage = 'No se pudo generar la descarga temporal.';
          return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      error: (error) => {
        console.error('[DocumentRepository] download-url failed', error);
        this.feedbackMessage = 'No se pudo preparar la descarga del documento.';
      },
    });
  }

  protected refreshSelectedDocument(): void {
    if (!this.selectedDocument) {
      return;
    }
    this.documentRepositoryService.getById(this.selectedDocument.id).subscribe({
      next: (response) => {
        if (response.data) {
          this.patchDocument(response.data);
        }
      },
      error: (error) => console.error('[DocumentRepository] refresh metadata failed', error),
    });
  }

  protected addTagToSelected(tagId: string): void {
    if (!this.selectedDocument || !tagId) {
      return;
    }
    this.tagService.addToDocument(this.selectedDocument.id, tagId).subscribe({
      next: (response) => {
        this.patchDocument(response.data);
        this.feedbackMessage = 'Etiqueta agregada al documento.';
      },
      error: (error) => {
        console.error('[DocumentRepository] add tag failed', error);
        this.feedbackMessage = 'No se pudo agregar la etiqueta.';
      },
    });
  }

  protected removeTagFromSelected(tagId: string): void {
    if (!this.selectedDocument || !tagId) {
      return;
    }
    this.tagService.removeFromDocument(this.selectedDocument.id, tagId).subscribe({
      next: (response) => {
        this.patchDocument(response.data);
        this.feedbackMessage = 'Etiqueta removida del documento.';
      },
      error: (error) => {
        console.error('[DocumentRepository] remove tag failed', error);
        this.feedbackMessage = 'No se pudo remover la etiqueta.';
      },
    });
  }

  protected changePage(delta: number): void {
    const nextPage = this.page + delta;
    if (nextPage < 0 || (this.totalPages && nextPage >= this.totalPages)) {
      return;
    }
    this.page = nextPage;
    this.loadRepository();
  }

  protected toggleSort(field: string): void {
    if (this.sortBy === field) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = field;
      this.sortDirection = 'DESC';
    }
    this.loadRepository(true);
  }

  protected selectedFolderName(): string {
    if (!this.selectedFolderId) {
      return 'Todo el repositorio';
    }
    return this.findFolderById(this.selectedFolderId, this.folderTree)?.name ?? 'Carpeta seleccionada';
  }

  protected roleScopeLabel(): string {
    const user = this.authService.currentUser();
    const roles = user?.roles ?? [];
    if (roles.includes('ROLE_ADMIN')) {
      return 'Admin - todas las areas/departamentos';
    }
    if (roles.includes('ROLE_CLIENT')) {
      return 'Cliente - solo documentos propios';
    }
    return `Funcionario - area ${this.currentAreaLabel()}`;
  }

  protected currentTenantLabel(): string {
    return this.currentAreaLabel();
  }

  protected currentAreaLabel(): string {
    return this.currentUserAreaId() || this.documents[0]?.tenantId || this.selectedDocument?.tenantId || 'actual';
  }

  protected areaLabel(tenantId?: string): string {
    if (!tenantId) {
      return 'Sin area';
    }
    return this.areas.find((area) => area.id === tenantId)?.nombre || this.humanizeIdentifier(tenantId, 'Area');
  }

  protected ownerArea(document: DocumentMetadata): string {
    return document.ownerAreaId || document.tenantId;
  }

  protected accessAreas(document: DocumentMetadata): string[] {
    const areas = new Set<string>();
    for (const area of document.allowedAreaIds ?? []) {
      if (area) {
        areas.add(area);
      }
    }
    for (const rule of document.accessRules ?? []) {
      if (rule.areaId) {
        areas.add(rule.areaId);
      }
    }
    areas.delete(this.ownerArea(document));
    return Array.from(areas).sort();
  }

  protected accessSummary(document: DocumentMetadata): string {
    const areas = this.accessAreas(document);
    if (!areas.length) {
      return 'Solo area propietaria';
    }
    return areas.slice(0, 2).map((area) => this.areaLabel(area)).join(', ')
      + (areas.length > 2 ? ` +${areas.length - 2}` : '');
  }

  protected currentUserPermissionLabel(document: DocumentMetadata): string {
    if (this.isAdmin()) {
      return 'Admin: acceso total';
    }
    const userArea = this.currentUserAreaId();
    if (!userArea) {
      return 'Sin area asignada';
    }
    if (userArea === document.tenantId || userArea === this.ownerArea(document)) {
      return 'Propietario del area';
    }
    const rule = (document.accessRules ?? []).find((item) => item.areaId === userArea);
    if (rule) {
      const permissions = [
        rule.canView ? 'ver' : '',
        rule.canEdit ? 'editar' : '',
        rule.canDownload ? 'descargar' : '',
        rule.canApprove ? 'aprobar' : '',
      ].filter(Boolean);
      return permissions.length ? permissions.join(' / ') : 'Sin permiso activo';
    }
    return (document.allowedAreaIds ?? []).includes(userArea) ? 'Ver / descargar' : 'Sin acceso compartido';
  }

  protected isAdmin(): boolean {
    return this.authService.currentUser()?.roles?.includes('ROLE_ADMIN') ?? false;
  }

  protected processGroups(): ProcessGroup[] {
    const groups = new Map<string, ProcessGroup>();
    for (const document of this.repositoryIndexDocuments) {
      if (this.selectedAreaId && document.tenantId !== this.selectedAreaId) {
        continue;
      }
      const processInstanceId = document.processInstanceId || 'sin-proceso';
      const key = `${document.tenantId}|${processInstanceId}`;
      const current = groups.get(key) ?? {
        tenantId: document.tenantId,
        processInstanceId,
        processKey: document.processKey,
        sampleDocumentName: document.originalName,
        count: 0,
        latest: document.updatedAt || document.uploadedAt || document.createdAt,
      };
      current.count += 1;
      current.processKey ||= document.processKey;
      current.sampleDocumentName ||= document.originalName;
      const documentDate = document.updatedAt || document.uploadedAt || document.createdAt;
      if (documentDate && (!current.latest || new Date(documentDate).getTime() > new Date(current.latest).getTime())) {
        current.latest = documentDate;
      }
      groups.set(key, current);
    }
    return Array.from(groups.values()).sort((left, right) => {
      const areaCompare = left.tenantId.localeCompare(right.tenantId);
      return areaCompare !== 0 ? areaCompare : right.processInstanceId.localeCompare(left.processInstanceId);
    });
  }

  protected processGroupTitle(group: ProcessGroup): string {
    if (group.processKey && group.processKey !== 'sin-proceso') {
      return this.humanizeIdentifier(group.processKey, 'Proceso');
    }
    if (group.sampleDocumentName) {
      return this.documentNameBase(group.sampleDocumentName);
    }
    return group.processInstanceId === 'sin-proceso'
      ? 'Documentos sin proceso'
      : `Proceso ${this.shortId(group.processInstanceId)}`;
  }

  protected processGroupSubtitle(group: ProcessGroup): string {
    return [
      `${group.count} ${group.count === 1 ? 'documento' : 'documentos'}`,
      this.areaLabel(group.tenantId),
      this.shortId(group.processInstanceId),
      this.formatDate(group.latest),
    ].filter(Boolean).join(' - ');
  }

  protected selectedProcessLabel(): string {
    if (!this.selectedProcessInstanceId) {
      return '';
    }
    const group = this.processGroups().find((item) => item.processInstanceId === this.selectedProcessInstanceId);
    return group ? this.processGroupTitle(group) : `Proceso ${this.shortId(this.selectedProcessInstanceId)}`;
  }

  protected storagePath(document: DocumentMetadata): string {
    if (document.s3Key) {
      const parts = document.s3Key.split('/').filter(Boolean);
      if (parts.length >= 4) {
        return parts.slice(0, 4).join(' / ');
      }
      return parts.join(' / ');
    }
    return [document.tenantId, document.processInstanceId, document.id, `v${document.version || 1}`]
      .filter(Boolean)
      .join(' / ');
  }

  protected folderCount(nodes: FolderTreeNode[] = this.folderTree): number {
    return nodes.reduce((total, node) => total + 1 + this.folderCount(node.children ?? []), 0);
  }

  protected hasFolders(): boolean {
    return this.folderCount() > 0;
  }

  protected hasVirtualFolders(): boolean {
    return this.processGroups().length > 0;
  }

  protected areaFolderGroups(): AreaFolderGroup[] {
    if (!this.isAdmin()) {
      return [{ tenantId: this.currentTenantLabel(), folders: this.folderTree }];
    }

    const grouped = new Map<string, FolderTreeNode[]>();
    for (const folder of this.folderTree) {
      grouped.set(folder.tenantId, [...(grouped.get(folder.tenantId) ?? []), folder]);
    }

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([tenantId, folders]) => ({ tenantId, folders }));
  }

  protected selectedFolderPath(): FolderTreeNode[] {
    if (!this.selectedFolderId) {
      return [];
    }
    return this.findFolderPath(this.selectedFolderId, this.folderTree) ?? [];
  }

  protected folderName(folderId?: string): string {
    if (!folderId) {
      return 'Sin carpeta';
    }
    const folder = this.findFolderById(folderId, this.folderTree);
    return folder ? this.folderDisplayName(folder) : 'Carpeta';
  }

  protected folderDisplayName(folder: FolderTreeNode): string {
    return this.humanizeIdentifier(folder.name || folder.id, 'Carpeta');
  }

  protected documentTags(document: DocumentMetadata): Tag[] {
    if (document.tags?.length) {
      return document.tags;
    }
    const ids = new Set(document.tagIds ?? []);
    return this.tags.filter((tag) => ids.has(tag.id));
  }

  protected availableTagsForSelected(): Tag[] {
    const currentIds = new Set(this.selectedDocument?.tagIds ?? this.selectedDocument?.tags?.map((tag) => tag.id) ?? []);
    return this.tags.filter((tag) => !currentIds.has(tag.id));
  }

  protected fileKind(document: DocumentMetadata): string {
    const mime = document.mimeType?.toLowerCase() ?? '';
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('word') || mime.includes('officedocument.wordprocessingml')) return 'DOCX';
    if (mime.includes('sheet') || mime.includes('excel')) return 'XLSX';
    if (mime.includes('image')) return 'IMG';
    return document.originalName?.split('.').pop()?.toUpperCase() || 'DOC';
  }

  protected fileIcon(document: DocumentMetadata): string {
    const kind = this.fileKind(document);
    if (kind === 'PDF') return 'PDF';
    if (kind === 'DOCX') return 'W';
    if (kind === 'XLSX') return 'X';
    if (kind === 'IMG') return 'IMG';
    return 'DOC';
  }

  protected formatSize(size?: number): string {
    if (!size) return '0 KB';
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected formatDate(value?: string): string {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  protected displayUser(document: DocumentMetadata): string {
    return document.updatedBy || document.uploadedBy || 'Sistema';
  }

  protected isEditable(document: DocumentMetadata): boolean {
    if (document.documentState === 'FINAL' || document.documentState === 'ARCHIVED') {
      return false;
    }
    return document.editable !== false && this.isOfficeDocument(document) && this.canCurrentUser(document, 'edit');
  }

  protected canDownload(document: DocumentMetadata): boolean {
    return this.canCurrentUser(document, 'download');
  }

  protected canManageTags(): boolean {
    const roles = this.authService.currentUser()?.roles ?? [];
    return !roles.includes('ROLE_CLIENT');
  }

  protected isOfficeDocument(document: DocumentMetadata): boolean {
    const mime = document.mimeType?.toLowerCase() ?? '';
    return mime.includes('word') || mime.includes('officedocument') || mime.includes('sheet') || mime.includes('excel');
  }

  protected isRecentlyUpdated(document: DocumentMetadata): boolean {
    const updatedAt = document.updatedAt || document.uploadedAt || document.createdAt;
    if (!updatedAt) return false;
    const elapsed = Date.now() - new Date(updatedAt).getTime();
    return elapsed >= 0 && elapsed < 1000 * 60 * 60 * 24;
  }

  private canCurrentUser(document: DocumentMetadata, permission: 'view' | 'edit' | 'download' | 'approve'): boolean {
    if (this.isAdmin()) {
      return true;
    }
    const userArea = this.currentUserAreaId();
    if (!userArea) {
      return false;
    }
    if (userArea === document.tenantId || userArea === this.ownerArea(document)) {
      return true;
    }
    const rule = (document.accessRules ?? []).find((item) => item.areaId === userArea);
    if (rule) {
      if (permission === 'view') return !!rule.canView;
      if (permission === 'download') return !!rule.canDownload || !!rule.canView;
      if (permission === 'edit') return !!rule.canEdit;
      return !!rule.canApprove;
    }
    return (permission === 'view' || permission === 'download') && (document.allowedAreaIds ?? []).includes(userArea);
  }

  private currentUserAreaId(): string {
    const user = this.authService.currentUser();
    return user?.areaId?.trim() || user?.tenantId?.trim() || '';
  }

  protected stateLabel(state?: DocumentLifecycleState): string {
    const labels: Record<DocumentLifecycleState, string> = {
      PENDING: 'Pendiente',
      UPLOADED: 'Subido',
      IN_REVIEW: 'En revision',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
      FINAL: 'Final',
      ARCHIVED: 'Archivado',
    };
    return state ? labels[state] : 'Sin estado';
  }

  protected stateClass(state?: DocumentLifecycleState): string {
    return `state-chip state-chip--${(state ?? 'neutral').toLowerCase().replace('_', '-')}`;
  }

  private patchDocument(document: DocumentMetadata): void {
    this.documents = this.documents.map((item) => (item.id === document.id ? document : item));
    this.selectedDocument = document;
  }

  private resolveMimeFilter(): string | undefined {
    if (!this.selectedMimeType) {
      return undefined;
    }
    const filters: Record<string, string> = {
      word: 'word',
      pdf: 'pdf',
      image: 'image',
      sheet: 'sheet',
    };
    return filters[this.selectedMimeType] ?? this.selectedMimeType;
  }

  private findFolderById(folderId: string, nodes: FolderTreeNode[]): FolderTreeNode | null {
    for (const node of nodes) {
      if (node.id === folderId) {
        return node;
      }
      const child = this.findFolderById(folderId, node.children ?? []);
      if (child) {
        return child;
      }
    }
    return null;
  }

  private findFolderPath(folderId: string, nodes: FolderTreeNode[], path: FolderTreeNode[] = []): FolderTreeNode[] | null {
    for (const node of nodes) {
      const nextPath = [...path, node];
      if (node.id === folderId) {
        return nextPath;
      }
      const childPath = this.findFolderPath(folderId, node.children ?? [], nextPath);
      if (childPath) {
        return childPath;
      }
    }
    return null;
  }

  private humanizeIdentifier(value: string, fallback: string): string {
    const normalized = value?.trim();
    if (!normalized) {
      return fallback;
    }
    if (this.looksLikeObjectId(normalized) || this.looksLikeUuid(normalized)) {
      return `${fallback} ${this.shortId(normalized)}`;
    }
    return normalized
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
      .join(' ');
  }

  private documentNameBase(fileName: string): string {
    const withoutExtension = fileName.trim().replace(/\.[^.]+$/, '');
    return this.humanizeIdentifier(withoutExtension, 'Documento');
  }

  private shortId(value?: string): string {
    if (!value) {
      return '';
    }
    if (value === 'sin-proceso') {
      return 'sin proceso';
    }
    return value.length <= 10 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
  }

  private looksLikeObjectId(value: string): boolean {
    return /^[a-f0-9]{24}$/i.test(value);
  }

  private looksLikeUuid(value: string): boolean {
    return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
  }
}
