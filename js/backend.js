/* Backend: Firebase (compartilhado) se config.js estiver preenchido; senão modo local (localStorage). */
window.Backend = (function () {
  const cfg = window.DISCIPLINE_FIREBASE;
  const nickKey = n => String(n).trim().toLowerCase();

  /* =================== MODO LOCAL =================== */
  function makeLocal() {
    const KEY = 'discipline.local.v1', SES = 'discipline.local.session';
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { users: {}, forms: {} }; } catch (e) { return { users: {}, forms: {} }; } };
    const save = db => localStorage.setItem(KEY, JSON.stringify(db));
    const rnd = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

    async function hash(pw, salt) {
      try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) { return btoa(salt + pw); }
    }

    return {
      mode: 'local',
      async restore() { const id = localStorage.getItem(SES); return id && load().users[id] ? id : null; },
      async nickTaken(nick) { return Object.values(load().users).some(u => u.nickLower === nickKey(nick)); },
      async register({ nick, email, password, profile }) {
        const db = load();
        const em = email.trim().toLowerCase();
        if (Object.values(db.users).some(u => u.nickLower === nickKey(nick))) throw new Error('Esse nick já está em uso.');
        if (Object.values(db.users).some(u => u._email === em)) throw new Error('Esse e-mail já está cadastrado.');
        const uid = rnd(), salt = rnd();
        db.users[uid] = Object.assign({}, profile, { uid, _email: em, _salt: salt, _hash: await hash(password, salt) });
        db.forms[uid] = [];
        save(db);
        localStorage.setItem(SES, uid);
        return uid;
      },
      async login(email, password) {
        const db = load(), em = email.trim().toLowerCase();
        const u = Object.values(db.users).find(x => x._email === em);
        if (!u || (await hash(password, u._salt)) !== u._hash) throw new Error('E-mail ou senha incorretos.');
        localStorage.setItem(SES, u.uid);
        return u.uid;
      },
      async logout() { localStorage.removeItem(SES); },
      async getEmail(uid) { const u = load().users[uid]; return u ? u._email : ''; },
      async getUser(uid) { return strip(load().users[uid]); },
      async listUsers() { return Object.values(load().users).map(strip); },
      async submitForm(uid, formDoc, patch) {
        const db = load();
        Object.assign(db.users[uid], patch);
        (db.forms[uid] = db.forms[uid] || []).push(Object.assign({ id: rnd() }, formDoc));
        save(db);
      },
      async updateUser(uid, patch) { const db = load(); Object.assign(db.users[uid], patch); save(db); },
      async listForms(uid, n = 20) { return (load().forms[uid] || []).slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, n); },
      async listDayForms(uid, date) { return (load().forms[uid] || []).filter(f => f.date === date); }
    };
    function strip(u) { if (!u) return null; const c = Object.assign({}, u); delete c._email; delete c._salt; delete c._hash; return c; }
  }

  /* =================== FIREBASE =================== */
  function makeFirebase(cfg) {
    let A, F, auth, db;
    const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
    const ready = (async () => {
      const [app, au, fs] = await Promise.all([
        import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')
      ]);
      A = au; F = fs;
      const a = app.initializeApp(cfg);
      auth = A.getAuth(a); db = F.getFirestore(a);
    })();

    const errMap = {
      'auth/email-already-in-use': 'Esse e-mail já está cadastrado.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/wrong-password': 'E-mail ou senha incorretos.',
      'auth/user-not-found': 'E-mail ou senha incorretos.',
      'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
      'auth/network-request-failed': 'Sem conexão com o servidor.',
      'auth/operation-not-allowed': 'Login por e-mail/senha não está ativado no Firebase (veja o README).',
      'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase (veja o README).',
      'permission-denied': 'Sem permissão no servidor. Confira as regras do Firestore (veja o README).'
    };
    const wrap = async fn => {
      await ready;
      try { return await fn(); }
      catch (e) { throw new Error(errMap[e.code] || e.message || 'Erro inesperado.'); }
    };
    const docData = d => (d.exists() ? d.data() : null);

    return {
      mode: 'firebase',
      restore() {
        return ready.then(() => new Promise(res => { const off = A.onAuthStateChanged(auth, u => { off(); res(u ? u.uid : null); }); }));
      },
      nickTaken: nick => wrap(async () => (await F.getDoc(F.doc(db, 'nicks', nickKey(nick)))).exists()),
      register: ({ nick, email, password, profile }) => wrap(async () => {
        const cred = await A.createUserWithEmailAndPassword(auth, email.trim(), password);
        const uid = cred.user.uid;
        try {
          const batch = F.writeBatch(db);
          batch.set(F.doc(db, 'nicks', nickKey(nick)), { uid, nick });
          batch.set(F.doc(db, 'users', uid), Object.assign({}, profile, { uid }));
          await batch.commit();
        } catch (e) {
          try { await cred.user.delete(); } catch (_) { /* ignore */ }
          if (e.code === 'permission-denied') throw new Error('Esse nick já está em uso (ou as regras do Firestore não foram publicadas).');
          throw e;
        }
        return uid;
      }),
      login: (email, password) => wrap(async () => (await A.signInWithEmailAndPassword(auth, email.trim(), password)).user.uid),
      logout: () => wrap(() => A.signOut(auth)),
      getEmail: async () => (auth && auth.currentUser ? auth.currentUser.email : ''),
      getUser: uid => wrap(async () => docData(await F.getDoc(F.doc(db, 'users', uid)))),
      listUsers: () => wrap(async () => (await F.getDocs(F.collection(db, 'users'))).docs.map(d => d.data())),
      submitForm: (uid, formDoc, patch) => wrap(async () => {
        const batch = F.writeBatch(db);
        batch.update(F.doc(db, 'users', uid), patch);
        batch.set(F.doc(F.collection(db, 'users', uid, 'forms')), formDoc);
        await batch.commit();
      }),
      updateUser: (uid, patch) => wrap(() => F.updateDoc(F.doc(db, 'users', uid), patch)),
      listForms: (uid, n = 20) => wrap(async () => {
        const q = F.query(F.collection(db, 'users', uid, 'forms'), F.orderBy('createdAt', 'desc'), F.limit(n));
        return (await F.getDocs(q)).docs.map(d => Object.assign({ id: d.id }, d.data()));
      }),
      listDayForms: (uid, date) => wrap(async () => {
        const q = F.query(F.collection(db, 'users', uid, 'forms'), F.where('date', '==', date));
        return (await F.getDocs(q)).docs.map(d => d.data());
      })
    };
  }

  return cfg && cfg.apiKey && cfg.projectId ? makeFirebase(cfg) : makeLocal();
})();
