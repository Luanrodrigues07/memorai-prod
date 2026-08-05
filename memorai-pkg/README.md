# Memorai

App pessoal de agenda, tarefas e desafios de disciplina.

## Rodar no Mac (desenvolvimento)

Pré-requisito: ter o **Node.js** instalado (versão LTS). Baixe em https://nodejs.org se ainda não tiver.

No terminal, dentro desta pasta:

```bash
npm install      # instala as dependências (só na primeira vez)
npm run dev      # inicia o app em modo desenvolvimento
```

Depois abra no navegador o endereço que aparecer (normalmente http://localhost:5173).

## Gerar a versão de produção

```bash
npm run build    # gera a pasta dist/ otimizada
npm run preview  # testa a versão de produção localmente
```

## Estrutura

- `src/db.js` — banco de dados local (IndexedDB via Dexie) e regras de negócio
- `src/lib/dates.js` — helpers de data/hora e layout do calendário
- `src/components/` — telas e componentes (Agenda, Tarefas, Desafios, etc.)

## Personalizar a cor da marca

Em `src/styles.css`, no topo, troque as três variáveis:

```css
--blue:#2F6FED; --blue-ink:#1B4ED1; --blue-tint:#EDF2FE;
```

## Próximos passos planejados

1. Integração com Google Calendar (login + leitura da agenda real)
2. Sincronização na nuvem com conta de usuário
3. Empacotar como app de Mac (Tauri) para distribuição / App Store
# memorai
