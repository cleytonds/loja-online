function ProductCard({ nome, preco }) {
  return (
    <div className="bg-white rounded shadow hover:shadow-lg transition">
      <div className="h-56 bg-gray-200 rounded-t"></div>

      <div className="p-4">
        <h3 className="font-medium">{nome}</h3>
        <p className="text-gray-600 mt-1">R$ {preco}</p>

        <button className="mt-4 w-full bg-black text-white py-2 rounded hover:bg-gray-800">
          Comprar
        </button>
      </div>
    </div>
  )
}

export default ProductCard