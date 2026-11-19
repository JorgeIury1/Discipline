# Discipline 🎖️

Site de estudo em grupo gamificado: ranking por nível, XP, conquistas, formulário diário,
perfil exportável em imagem, tema claro/escuro e tamanho de fonte ajustável.
Não precisa instalar nada nem compilar: é só HTML/CSS/JS.

## 1) Colocar no GitHub e publicar (5 minutos)

1. Crie um repositório novo no GitHub (ex.: `discipline`).
2. Envie **todos os arquivos desta pasta** (arraste e solte em *Add file → Upload files*).
   O `index.html` precisa ficar na raiz do repositório.
3. Vá em **Settings → Pages → Build and deployment**:
   *Source*: `Deploy from a branch` · *Branch*: `main` · pasta `/ (root)` · **Save**.
4. Em ~1 minuto o site abre em `https://SEU-USUARIO.github.io/discipline/`.

Pronto: já funciona em **modo local** (cada pessoa vê só os próprios dados no próprio navegador).

## 2) Ranking compartilhado entre os amigos (Firebase, grátis)

O GitHub Pages só hospeda arquivos; para vocês verem o ranking uns dos outros, os dados
precisam ficar num servidor. Usamos o Firebase (plano gratuito basta). Faça uma vez:

1. Entre em <https://console.firebase.google.com> → **Adicionar projeto** (pode desativar o Analytics).
2. **Build → Authentication → Get started → Sign-in method → E-mail/senha → Ativar**.
3. **Build → Firestore Database → Criar banco de dados** (modo produção, qualquer região).
   Depois, na aba **Regras**, apague tudo, cole o conteúdo do arquivo `firestore.rules` e **Publicar**.
4. **Authentication → Settings → Authorized domains → Add domain**:
   adicione `SEU-USUARIO.github.io`.
5. **Configurações do projeto (engrenagem) → Seus apps → `</>` (Web)** → registre o app
   e copie o objeto `firebaseConfig`.
6. No GitHub, edite o arquivo `config.js`: troque `window.DISCIPLINE_FIREBASE = null;`
   pelo objeto copiado (o exemplo está comentado no próprio arquivo). Commit.

Todos que abrirem o link passam a usar a mesma base: cadastro com nick exclusivo, ranking
com todos os perfis e dados salvos na nuvem.

## Regras implementadas (das suas notas)

- **Cadastro**: nick (único), e-mail, senha → preferências (até 3 melhores / 1 a 3 piores, sem repetir) →
  ENEM 2026 (acertos 1–45 em Linguagens, Humanas, Naturezas e Exatas) → XP inicial pela soma das faixas.
- **XP**: hora = 100 XP (120 nas matérias em que você vai pior) · questão = 5 · redação = 150.
- **Formulário diário**: matérias com horas/minutos (mín. 30 min cada, máx. 20h), questões 0–1000, redações 0–10, nota opcional.
- **Níveis 1–50**: o nível 50 equivale a ~1000 h de estudo (100.000 XP). A curva é progressiva (níveis iniciais sobem rápido).
- **Títulos** nos níveis 1, 5, 14, 20, 25, 30, 35, 40, 45 e 50 (no 50 você escolhe o seu).
- **16 conquistas** com os XPs definidos (Madrugador, Maratonas, Polivalente, Sequências, Máquinas de questões/simulados, etc.).
- **Ranking** na tela inicial, por nível (desempate por XP), com todos os perfis cadastrados.
- **Perfil**: sequência atual/máxima, XP total, matérias, histórico e **Exportar perfil** (cartão PNG).
- **Aparência**: tema claro/escuro/automático, 4 tamanhos de fonte, layout de celular (barra inferior) e de PC (menu lateral).

## Observações

- O nome no arquivo `Nome.md` estava "Disciple"; usei **Discipline** (nome da pasta e das demais notas).
  Para mudar, troque o texto em `index.html`, `js/app.js` e `js/data.js`.
- Os cálculos de XP rodam no navegador (é um site entre amigos). Quem mexer nas ferramentas do navegador poderia
  se dar XP; as regras do Firestore impedem só que alguém altere o perfil dos *outros*.
- Fonte Inter vem do Google Fonts; se estiver offline, o site usa a fonte do sistema.
