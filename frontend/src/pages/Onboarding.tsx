import { useNavigate } from "react-router"
import { Mountain } from "lucide-react"

function Onboarding() {
  const navigate = useNavigate()

  return (
    <section className="mx-auto flex max-w-3xl items-center justify-center md:min-h-[75vh]">
      <div className="w-full text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#314936] text-white">
          <Mountain size={30} />
        </div>

        <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-[#687565] md:mt-8">
          Welcome to Talus
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
          Find hikes that feel like you.
        </h1>

        <p className="mx-auto mt-4 max-w-xl leading-7 text-[#687565] md:mt-5 md:text-lg md:leading-8">
          Talus learns what you like and uses it to help
          you find trails you'll love.
        </p>

        <div className="mx-auto mt-10 max-w-2xl md:mt-12">
          <h2 className="text-xl font-semibold md:text-2xl">
            Have you hiked before?
          </h2>

          <p className="mt-2 text-[#687565]">
            This helps Talus personalize your first experience.
          </p>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                navigate("/onboarding/hikes")
              }}
              className="rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 text-left transition active:scale-[0.99] md:p-7 md:hover:-translate-y-1 hover:border-[#9da695] hover:bg-[#e8e3d6]"
            >
              <h3 className="text-xl font-semibold">
                I've hiked before
              </h3>

              <p className="mt-2 leading-7 text-[#687565]">
                Help Talus learn your hiking preferences
                based on the kinds of trails you'd choose.
              </p>

              <p className="mt-5 font-medium text-[#314936]">
                Let's get started →
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate("/compare?experience=new")
              }}
              className="rounded-3xl border border-[#d8d2c4] bg-[#ebe6da] p-5 text-left transition active:scale-[0.99] md:p-7 md:hover:-translate-y-1 hover:border-[#9da695] hover:bg-[#e8e3d6]"
            >
              <h3 className="text-xl font-semibold">
                I'm new to hiking
              </h3>

              <p className="mt-2 leading-7 text-[#687565]">
                Tell Talus what sounds appealing for your
                first hiking adventure.
              </p>

              <p className="mt-5 font-medium text-[#314936]">
                Find my first hike →
              </p>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Onboarding
