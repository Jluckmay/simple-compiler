// runtimes/htmlcss.mjs — HTML/CSS não executa código; retorna uma mensagem
// informando que o conteúdo pode ser visualizado diretamente no editor.

export async function run() {
  return {
    output: "",
    error: null,
  };
}
