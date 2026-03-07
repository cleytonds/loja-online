import Header from '../components/Header'

function Home() {
  return (
    <>
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold mb-8">Novidades</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 shadow rounded">
            <h3 className="font-semibold text-lg">Camisa</h3>
            <p className="text-gray-600">R$ 50,00</p>
          </div>

          <div className="bg-white p-4 shadow rounded">
            <h3 className="font-semibold text-lg">Calça</h3>
            <p className="text-gray-600">R$ 80,00</p>
          </div>

          <div className="bg-white p-4 shadow rounded">
            <h3 className="font-semibold text-lg">Tênis</h3>
            <p className="text-gray-600">R$ 120,00</p>
          </div>
        </div>
      </main>
    </>
  )
}

export default Home