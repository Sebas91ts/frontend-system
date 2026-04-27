import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LanguagePreference, UiPreferencesService } from '../../../../core/services/ui-preferences.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css',
})
export class SettingsPageComponent {
  protected readonly preferences = inject(UiPreferencesService);
  private readonly router = inject(Router);

  protected t(key: Parameters<UiPreferencesService['translate']>[0]): string {
    return this.preferences.translate(key);
  }

  protected get themeLabel(): string {
    return this.preferences.isDarkMode() ? this.t('settings.dark') : this.t('settings.light');
  }

  protected onLanguageChange(language: string): void {
    this.preferences.setLanguage(language as LanguagePreference);
  }

  protected goBack(): void {
    void this.router.navigate(['/user']);
  }
}
