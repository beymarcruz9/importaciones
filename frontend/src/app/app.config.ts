import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions, withHashLocation } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // withHashLocation() garantiza compatibilidad total con GitHub Pages evitando errores 404 al recargar
    provideRouter(routes, withComponentInputBinding(), withViewTransitions(), withHashLocation()),
    provideHttpClient(),
  ],
};
