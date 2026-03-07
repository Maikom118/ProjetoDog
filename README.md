
  # PetConnect - Login & Dashboard (Full-Stack)

  Este é o projeto **PetConnect**, uma plataforma que conecta tutores de pets a cuidadores confiáveis. O projeto agora conta com um **Backend funcional** integrado para Login e Cadastro.

  ## Estrutura do Projeto

  - `src/`: Frontend em React + Vite + TailwindCSS.
  - `server/`: Backend em Node.js + Express.

  ## Como Rodar o Projeto

  ### 1. Instalar Dependências

  Na pasta raiz do projeto, instale as dependências do frontend:
  ```powershell
  npm install
  ```

  E as dependências do backend:
  ```powershell
  cd server
  npm install
  cd ..
  ```

  ### 2. Iniciar o Aplicativo (Front + Back)

  Para rodar tanto o frontend quanto o backend simultaneamente, use o comando na raiz:
  ```powershell
  npm run dev
  ```

  O frontend estará disponível em `http://localhost:5173`

  ## Funcionalidades Implementadas

  - **Login:** Autenticação para Tutores e Cuidadores.
  - **Cadastro:** Criação de novas contas com login automático após o sucesso.
  - **Dashboard:** Página principal personalizada que muda conforme o tipo de usuário.
  - **Notificações:** Alertas visuais de sucesso e erro usando `sonner`.

  ## Contas de Teste

  - **Tutor:** `tutor@test.com` / Senha: `123`
  - **Cuidador:** `cuidador@test.com` / Senha: `123`

  