function Header() {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Minha Loja</h1>

        <nav className="space-x-6">
          <a href="/" className="text-gray-600 hover:text-black">
            Home
          </a>
          <a href="#" className="text-gray-600 hover:text-black">
            Produtos
          </a>
          <a href="#" className="text-gray-600 hover:text-black">
            Contato
          </a>
        </nav>
      </div>
    </header>
  )
}

export default Header