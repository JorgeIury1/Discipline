# Discipline

Site de grupo de estudos com XP, níveis, títulos, conquistas, ranking e diário de estudo.
Feito só com HTML, CSS e JavaScript: não precisa instalar nem compilar nada.

## Publicar no GitHub (GitHub Pages)

1. Crie um repositório novo no GitHub.
2. Envie os arquivos `index.html`, `style.css`, `app.js`, `logo.svg` e `README.md` para a raiz do repositório (botão **Add file > Upload files**).
3. Vá em **Settings > Pages**. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
4. Em cerca de 1 minuto o site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

Para testar no computador, basta abrir o `index.html` no navegador.

## Observação importante

Os dados (contas, formulários, ranking) ficam no `localStorage` do navegador de cada pessoa.
Por isso o ranking mostra apenas as contas criadas naquele mesmo navegador. Para o ranking
ser compartilhado entre os amigos em aparelhos diferentes, é preciso ligar o site a um banco
de dados online (por exemplo Supabase ou Firebase).
