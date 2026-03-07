import Header from '../components/Header'
import ProductCard from '../components/ProductCard'

function Home() {
  return (
    <>
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold mb-8">Destaques</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <ProductCard nome="Vestido Feminino" preco="129,90" />
          <ProductCard nome="Sandália Confort" preco="99,90" />
          <ProductCard nome="Bolsa Casual" preco="149,90" />
          <ProductCard nome="Blusa Feminina" preco="59,90" />
          <ProductCard nome="Sandália Rasteira" preco="79,90" />
          <ProductCard nome="Bolsa Transversal" preco="119,90" />
        </div>
      </main>
    </>
  )
}

export default Home