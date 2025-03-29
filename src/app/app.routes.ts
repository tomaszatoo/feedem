import { Routes } from '@angular/router';
// components
import { MainMenuComponent } from './components/main-menu/main-menu.component';
import { SettingsComponent } from './components/settings/settings.component';
import { GameComponent } from './components/game/game.component';

export const routes: Routes = [
    { path: '', component: MainMenuComponent },
    { path: 'settings', component: SettingsComponent },
    { path: 'game', component: GameComponent },
];
