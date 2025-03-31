import { Routes } from '@angular/router';
// components
import { MainMenuComponent } from './components/main-menu/main-menu.component';
import { SettingsComponent } from './components/settings/settings.component';
import { GameComponent } from './components/game/game.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { ControllerComponent } from './components/controller/controller.component';

export const routes: Routes = [
    { path: '', component: MainMenuComponent },
    { path: 'settings', component: SettingsComponent },
    { path: 'game', component: GameComponent },
    { path: 'controller', component: ControllerComponent },
    { path: '**', component: NotFoundComponent }
];
