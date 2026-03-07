export async function getProdutos() {
  const response = await fetch('http://localhost:3000/produtos')
  return response.json()
}