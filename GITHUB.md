# Share MindOrbit with your team and judges

GitHub can share this project's code and instructions. The complete Gemma companion runs through the local Node server and Ollama; uploading code does not create an online AI service.

## Upload through GitHub's website

1. Extract the prepared **MindOrbit-GitHub.zip** bundle. Upload its extracted contents, rather than the ZIP itself.
2. Sign in to GitHub and choose **New repository** at https://github.com/new. A name such as `mindorbit` works well.
3. Choose **Public** if judges should be able to read it without invitations. Choose **Private** if you want to invite specific people. Do not add an extra README or gitignore during repository creation; this project includes both.
4. Create the repository. Follow its **uploading an existing file** link, or choose **Add file → Upload files**.
5. Drag the extracted project files and folders into the upload area, keeping their structure. `index.html`, `package.json`, `server.mjs`, `README.md`, and `.gitignore` should be at the top level; `src`, `server`, `assets`, `scripts`, and `tests` should be folders beside them.
6. Enter a message such as **Add MindOrbit hackathon app** and commit the upload.
7. Share the repository URL. For a private repository, use **Settings → Collaborators** to invite the intended viewers and team members.

The prepared bundle contains source code, tests, and documentation. It excludes model weights, downloaded runtimes, browser data, exported support packets, generated ZIP files, and local screenshots. Browser uploads do not apply `.gitignore` filtering for you, so use the prepared bundle instead of uploading unrelated local files.

## Run the full AI companion on another computer

1. From the repository, choose **Code → Download ZIP**, then extract it.
2. Install Node.js 20 or newer and Ollama.
3. Open a terminal in the extracted project folder and download the required model once:

```sh
npm run setup:model
```

4. Start MindOrbit:

```sh
npm start
```

5. Open http://localhost:4173/#companion. Look for **Gemma 3 4B connected** and the **Gemma 3 4B · On this computer** label under generated replies.

Each computer needs its own Ollama installation and `gemma3:4b` model. `gemma:latest` is a different model. No API key or paid cloud account is required. Downloading the model requires internet; afterwards the local server and Ollama can run without internet. Journals and conversations stay in each person's local browser profile.

## Let judges view it

| What judges need | What to share |
| --- | --- |
| Review the code and project explanation | The GitHub repository URL |
| Try the complete Gemma chat | Repository URL plus the local setup steps above, or a live demonstration on your computer |
| See the app without installing software | A short screen recording or a hosted website preview |

GitHub Pages is static hosting: it cannot run this project's Node API or Ollama. A static copy would provide interface exploration and guided support, not the full Gemma chatbot. The current app also uses root-relative asset paths, so a GitHub Pages project URL would require a separate deployment configuration; simply enabling Pages is not a complete deployment procedure.

For an online chatbot that judges can open and use immediately, the app needs a hosted backend with access to an inference service. The current server intentionally accepts only local connections. That would be a separate deployment change, including deciding where chat data is processed and who can access the service.

For this hackathon, a practical submission is the **repository URL, a short demo video, and a live/local demonstration of Gemma working offline**.

## Official GitHub instructions

- [Create a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [Upload files through the browser](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [Invite repository collaborators](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-access-to-your-repository/inviting-collaborators-to-a-personal-repository)
- [What GitHub Pages hosts](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
