import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { appConfig } from './app/app.config';
import { App } from './app/app';

createApplication(appConfig)
  .then(appRef => {
    if (!customElements.get('mfe-angular')) {
      const AngularElement = createCustomElement(App, { injector: appRef.injector });
      customElements.define('mfe-angular', AngularElement);
    }
  })
  .catch(err => console.error(err));
