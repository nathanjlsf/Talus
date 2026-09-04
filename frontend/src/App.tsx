function App() {
  return (
    <main className="min-h-screen bg-[#f3efe4] text-[#26352a]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2rem] text-[#687565]">
          Talus
        </p>

        <h1 className="text-5xl font-semibold tracking-tight">
          Your hiking preferences,
          <br />
          discovered over time.
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-8 text-[#687565]">
          Talus learns what makes a great hike for you through simple
          comparisons, then usese those preferences to help you find your
          next favorite trail.
        </p>

        <div className="mt-10 flex gap-4">
          <button className="rounded-full bg-[#314936] px-6 py-3 font-medium text-white transition hover:bg-[#263b2b]">
            Start comparing
          </button>

          <button className="rounded-full border border-[#a8ad9f] px-6 py-3 font-medium text-[#314936] transition hover:bg-[#e8e3d6]">
            View rankings
          </button>
        </div>
      </div>
    </main>
  )
}

export default App