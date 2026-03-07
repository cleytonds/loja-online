import TopBar from './TopBar'

function Header() {
  return (
    <>
      <TopBar />

      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6">

          {/* Logo */}
          <h1 className="text-2xl font-bold">MinhaLoja</h1>

          {/* Menu */}
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <a href="#" className="hover:text-red-500">Feminino</a>
            <a href="#" className="hover:text-red-500">Sandálias</a>
            <a href="#" className="hover:text-red-500">Bolsas</a>
            <a href="#" className="hover:text-red-500">Novidades</a>
            <a href="#" className="text-red-500 font-semibold">Ofertas</a>
          </nav>

          {/* Busca */}
          <div className="flex-1 hidden md:block">
            <input
              type="text"
              placeholder="Estou pensando em calça jeans"
              className="w-full bg-gray-100 rounded-full px-4 py-2 outline-none"
            />
          </div>

          {/* Ícones */}
          <div className="flex gap-4 text-xl">
            <span>👤</span>
            <span>🤍</span>
            <span>🛒</span>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header