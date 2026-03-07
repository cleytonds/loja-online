const API_URL = "http://localhost:3000"

export async function buscarProdutos() {
  const response = await fetch(`${API_URL}/produtos`)
  return response.json()
}