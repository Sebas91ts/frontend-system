import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguagePreference, UiPreferencesService } from '../../../core/services/ui-preferences.service';

@Component({
  selector: 'app-ui-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ui-preferences.component.html',
  styleUrl: './ui-preferences.component.css',
})
export class UiPreferencesComponent {
  protected readonly preferences = inject(UiPreferencesService);
  protected isOpen = false;

  protected t(key: Parameters<UiPreferencesService['translate']>[0]): string {
    return this.preferences.translate(key);
  }

  protected get themeLabel(): string {
    return this.preferences.isDarkMode() ? this.t('settings.dark') : this.t('settings.light');
  }

  protected onLanguageChange(language: string): void {
    this.preferences.setLanguage(language as LanguagePreference);
  }

  protected togglePanel(): void {
    this.isOpen = !this.isOpen;
  }

  protected closePanel(): void {
    this.isOpen = false;
  }
}
