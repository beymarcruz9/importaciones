import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private app: FirebaseApp | null = null;
  public db: Firestore | null = null;
  public auth: Auth | null = null;
  public storage: FirebaseStorage | null = null;
  public isFirebaseReady = false;

  constructor() {
    this.initFirebase();
  }

  private initFirebase(): void {
    try {
      const cfg = environment.firebase;
      const isPlaceholder = !cfg || !cfg.apiKey || cfg.apiKey.includes('PEGA_AQUI') || cfg.apiKey.length < 10;

      if (!isPlaceholder) {
        if (!getApps().length) {
          this.app = initializeApp(cfg);
        } else {
          this.app = getApps()[0];
        }
        this.db = getFirestore(this.app);
        this.auth = getAuth(this.app);
        this.storage = getStorage(this.app);
        this.isFirebaseReady = true;
        console.log('Firebase inicializado correctamente con Google Cloud Firestore.');
      } else {
        console.warn('Firebase no tiene credenciales configuradas en environment.ts. Operando en modo local/fallback.');
        this.isFirebaseReady = false;
      }
    } catch (err) {
      console.error('Error al inicializar Firebase:', err);
      this.isFirebaseReady = false;
    }
  }

  public isConfigured(): boolean {
    return this.isFirebaseReady && !!this.db && !!this.auth;
  }
}
