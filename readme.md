# 🏷️ WEBOS BOUTIQUE — Uma Variante do WebOS (ByteSolutions)

<p align="center">
  <img src="assets/banner_webos_boutique.png" alt="WEBOS BOUTIQUE Banner" width="100%" />
</p>

<p align="center">
  <strong>WEBOS BOUTIQUE — Uma variante oficial do WebOS, desenvolvida pela ByteSolutions.</strong>
</p>

<p align="center">
  <strong>Sistema moderno de gestão para lojas de roupas e boutiques, desenvolvido com FastAPI, HTML, CSS e JavaScript.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-Async%20Backend-009688"> 
  <img src="https://img.shields.io/badge/Status-Estável-success"> 
  <img src="https://img.shields.io/badge/Linguagem-Python%203.10-blue"> 
  <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-yellow"> 
</p>

---

## 📌 Sobre o Projeto

O **WebOS Boutique** é um sistema completo para gestão interna de lojas de vestuário, incluindo controle de estoque, vendas, relatórios e organização de produtos. Construído com foco em **rapidez**, **simplicidade** e **produtividade**, oferece uma interface leve e totalmente integrada com uma API desenvolvida em FastAPI.

Ideal para pequenos e médios empreendedores que precisam de uma solução funcional e eficiente.

---

## 🚀 Tecnologias

### Backend

* **FastAPI** (API REST moderna e assíncrona)
* **Uvicorn** (servidor ASGI)
* **SQLite/MySQL** conforme necessidade
* **Pydantic** para validação

### Frontend

* **HTML5** — Estrutura das telas
* **CSS3** — Estilização própria e organizada
* **JavaScript** — Comunicação com a API (fetch)

---

## 🛍️ Funcionalidades Principais

### 🔹 Estoque

* Cadastro de produtos
* Atualização de quantidades
* Organização por categorias
* Listagem e pesquisa

### 🔹 Vendas / PDV

* Venda rápida
* Seleção de produtos
* Cálculo automático

### 🔹 Relatórios

* Relatório de vendas
* Relatório de estoque
* Resumo financeiro

### 🔹 Outros Recursos

* Código limpo e fácil de manter
* API documentada automaticamente via **Swagger UI**
* Frontend leve, responsivo e sem dependências externas

---

## 📂 Estrutura do Projeto

```
WEBOS-BOUTIQUE/
│
├── backend.py               # Servidor FastAPI principal
├── index.html               # Página inicial da aplicação
├── requirements.txt         # Dependências do projeto
├── .env                     # Variáveis de ambiente
│
├── pages/                   # Páginas internas do sistema (Frontend)
│   ├── dashboard.html
│   ├── clientes.html
│   ├── produtos.html
│   ├── vendas.html
│   ├── vendas_rapidas.html
│   └── relatorios.html
│
├── css/                     # Folhas de estilo independentes por módulo
│   ├── dashboard.css
│   ├── lingerie.css
│   ├── relatorio.css
│   ├── vendas_rapidas.css
│   └── style.css
│
├── js/                      # Scripts organizados por setor do sistema
│   ├── app.js
│   ├── auth.js
│   ├── cadusers.js
│   ├── caixa.js
│   ├── clientes.js
│   ├── configuracoes.js
│   ├── estoque.js
│   ├── gerencia.js
│   ├── produtos.js
│   ├── relatorios.js
│   ├── script.js
│   ├── scriptVendas.js
│   └── session_manager.js
│
└── venv/                    # Ambiente virtual Python
```

---

## 🧪 Como Rodar o Projeto

### 1. Clonar o repositório

```bash
git clone https://github.com/seuuser/webos-boutique.git
cd webos-boutique/backend
```

### 2. Instalar dependências

```bash
pip install -r requirements.txt
```

### 3. Iniciar o servidor FastAPI

```bash
uvicorn main:app --reload
```

A API estará disponível em:
👉 **[http://localhost:8000](http://localhost:8000)**
👉 **Documentação Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Abrir o Frontend

Abra `frontend/index.html` no navegador.

---

## 📸 Capturas de Tela (opcional)

> *Adicione suas imagens aqui:*

```
assets/screenshots/
  ├── dashboard.png
  ├── estoque.png
  └── vendas.png
```

---

## 📦 Futuras Implementações

* Sistema de login com níveis de acesso
* Dashboard avançado com gráficos
* Integração com impressoras térmicas
* Exportação de relatórios (PDF/Excel)
* Versão mobile / PWA

---

## 🤝 Contribuição

Contribuições são sempre bem-vindas!
Sinta-se à vontade para abrir *issues* ou enviar *pull requests*.

---

## 📄 Licença

Este projeto é distribuído sob licença **MIT**. Você pode usar, modificar e distribuir livremente.

---

Feito com 💙 por **Julio Abrantes**

---

## ⭐ Por que usar o WebOS Boutique?

* 🔥 **Interface rápida e moderna** sem dependências pesadas
* 🚀 **Backend FastAPI extremamente rápido**
* 📊 **Relatórios integrados** para facilitar decisões
* 🧩 **Arquitetura modular** (cada área tem seu JS e CSS)
* 🛡️ **Segurança com sessões e autenticação** (em desenvolvimento)
* 📱 **Fácil de transformar em PWA** futuramente
* ☁️ **Pronto para deploy em VPS / Hostinger**

---

## 🧭 Endpoints da API

A API do WebOS Boutique segue o padrão REST.

> ⚠️ *Obs: Ajuste conforme seu `backend.py` caso os endpoints mudem.*

### 🔹 Produtos

```
GET    /produtos           # Lista todos os produtos
GET    /produtos/{id}      # Retorna um produto específico
POST   /produtos           # Cria um novo produto
PUT    /produtos/{id}      # Atualiza um produto
DELETE /produtos/{id}      # Remove um produto
```

### 🔹 Clientes

```
GET    /clientes
POST   /clientes
PUT    /clientes/{id}
DELETE /clientes/{id}
```

### 🔹 Vendas

```
POST /vendas
GET  /vendas
```

### 🔹 Relatórios

```
GET /relatorios/estoque
GET /relatorios/vendas
```

---

## ☁️ Deploy na Hostinger (FastAPI + Frontend)

### 1. Subir o Backend (FastAPI) na VPS

* Instale dependências:

```bash
sudo apt update
sudo apt install python3 python3-pip -y
pip install fastapi uvicorn
```

### 2. Instale e configure o **supervisor**

```bash
sudo apt install supervisor -y
```

Crie o arquivo:

```
/etc/supervisor/conf.d/webos.conf
```

Com o conteúdo:

```
[program:webos]
command=uvicorn backend:app --host 0.0.0.0 --port 8001
directory=/var/www/webos-boutique
user=root
autostart=true
autorestart=true
```

Ative:

```bash
sudo supervisorctl reread
sudo supervisorctl update
```

### 3. Configurar NGINX para servir o frontend e redirecionar para a API

```bash
sudo apt install nginx -y
```

Crie o host:

```
/etc/nginx/sites-available/webos
```

Conteúdo:

```
server {
    listen 80;
    server_name seu_dominio.com;

    location / {
        root /var/www/webos-boutique;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001/;
    }
}
```

Ative:

```bash
sudo ln -s /etc/nginx/sites-available/webos /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

---

## 🎞️ Demonstração (GIF)

> *Você pode adicionar aqui um GIF mostrando o sistema em funcionamento.*

Sugestão de pasta:

```
assets/demo/demo.gif
```

E adicionar no README:

```
![Demonstração do Sistema](assets/demo/demo.gif)
```

---

## 🏅 Badges Adicionais

<p align="center">
  <img src="https://img.shields.io/badge/Framework-FastAPI-009688" />
  <img src="https://img.shields.io/badge/Frontend-HTML%20CSS%20JS-yellow" />
  <img src="https://img.shields.io/badge/License-MIT-blue" />
  <img src="https://img.shields.io/badge/Status-Ativo-success" />
</p>

---

## 📝 Licença MIT

```
MIT License

Copyright (c) 2025 Julio Abrantes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

#   W e b - O S - B o u t i q u e  
 