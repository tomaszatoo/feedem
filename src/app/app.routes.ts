import { Routes } from '@angular/router';
// components
import { MainMenuComponent } from './components/main-menu/main-menu.component';
import { SettingsComponent } from './components/settings/settings.component';
import { GameComponent } from './components/game/game.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

export const routes: Routes = [
    { path: '', component: MainMenuComponent },
    { path: 'settings', component: SettingsComponent },
    { path: 'game', component: GameComponent },
    { path: '**', component: NotFoundComponent }
];
