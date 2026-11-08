// runtimes/htmlcss.mjs — HTML/CSS não executa código; retorna o próprio HTML
// para ser renderizado em um iframe pelo frontend.

export async function run(code) {
  return {
    output: code || "",
    error: null,
  };
}
