# peng

[中文](README.md)

Turn a difficult Chinese sentence into one you can read at your level.

You will see three pages:

- **Home**: shows how a sentence gets rewritten. Choose 进入 to open the workbench.
- **Workbench**: talk with it. When you ask it to explain a sentence, the right side changes to an easier wording. 没看懂 steps that wording down one level.
- **Team**: the people who made this page.

The top bar switches between light and dark. After you choose once, this computer remembers.

## Open

Open either address in a browser:

- [https://peng-taupe.vercel.app](https://peng-taupe.vercel.app)
- [https://full-wren-d8g8nvxhy7c8cc8dd-1522218713.tcloudbaseapp.com/](https://full-wren-d8g8nvxhy7c8cc8dd-1522218713.tcloudbaseapp.com/)

Both addresses are the same page. To run it on your own computer, or to connect your own model, install [Node.js](https://nodejs.org/) 18 or newer. Then open a terminal in the project folder and run:

```bash
cd web
npm start
```

When the terminal prints a local address, open [http://localhost:5173/](http://localhost:5173/) in a browser. Closing the terminal stops the page on this computer. The two addresses above keep working.

To build the package used for publishing, run `npm run build` inside `web/`. The result is in `web/dist/`. With the local server running, open [http://localhost:5173/dist/](http://localhost:5173/dist/). Script and style filenames include a content hash and can be cached for a long time. The page and its data are not cached. The key file is not included in this package.

## Using the workbench

1. On the right side of the chat column, choose your HSK level. HSK is the grading used by the Chinese proficiency test: 1 is the easiest, 6 is the hardest. If you are unsure, leave the default at 3.
2. At the upper left, switch between 降维翻译 and 聊天. 降维翻译 simplifies the sentence you send onto the right side. 聊天 replies only on the left and does not change the right side.
3. Choose one of the sample sentences above the input, or type a sentence and send it. Words marked in the sentence can be opened for pinyin and meaning.
4. If you still cannot read it, choose 没看懂. That takes the last explanation down one more level. You can keep going until it becomes English. At English, it cannot go lower.

In 降维翻译, the original text on the right is the sentence you sent. Under it, the whole sentence is given in pinyin, then allusions, words above your current level, and a grammar breakdown. With a model connected, grammar above your level is taken out of any sentence. Without a model, only grammar that matches the word list is shown. Simplification follows the level you chose in the chat column. The first result is always Chinese, never English from the start. The ladder on the right can be clicked: choosing a rung rewrites the same sentence at that level. The original text, context, and pinyin stay as they are. The ladder cannot be clicked before a result exists, or while a request is in progress. Choosing 没看懂 again also leaves the original text, context, and pinyin in place, and only simplifies the wording one more level.

演示 runs through a built-in sentence on its own: submit, then 没看懂, repeatedly, until English. Do not type while it is playing. When it finishes, the result stays on the page.

The three sample sentences always use the built-in simplification and are not sent to a model. Under 日照香炉生紫烟 you will see 语境 · 一个人对着水杯说, which is the situation in which the sentence is spoken.

## Without a model

The two addresses above, and a local copy with no model filled in, work like this: in 降维翻译, sample sentences are simplified to the level you chose, and any other sentence appears on the right unchanged. After you switch to 聊天, the left side replies 接上模型后才能对话. The right side stays empty, or keeps the previous explanation. What you type stays in the browser.

## Connect your own model

The two addresses above do not include a personal model. To connect one, open the page on your own computer as above, then do these three steps. After that, 降维翻译 rewrites to the right at the chosen level, and 聊天 can hold a conversation. If a sentence starts with a scene written before a colon, such as 一个人对着水杯说：这水太烫了, the line under it becomes 语境 · 一个人对着水杯说. Without a scene, that line is empty. The three samples and 演示 still use built-in results.

Steps:

1. Copy `web/config/config.local.example.js` to `config.local.js` in the same folder.
2. Fill in the API address, key, and model name. Stop the address at `/v1`, for example `https://api.example.com/v1`. For DeepSeek, use `https://api.deepseek.com`, not the console address `platform.deepseek.com`.
3. Save, then refresh the page.

The API must accept requests in the OpenAI chat format, and must allow this page to call it directly from the browser. The key stays only in this file on your computer. 演示 still uses the built-in sentence and does not send the demo to the model.
