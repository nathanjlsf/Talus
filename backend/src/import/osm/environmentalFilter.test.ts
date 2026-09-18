import {
  describe,
  expect,
  it,
} from "vitest"

import {
  filterEnvironmentalFeatures,
} from "./environmentalFilter.js"

describe(
  "filterEnvironmentalFeatures",
  () => {
    const trailGeometry = [
      {
        lat: 37.25,
        lon: -122.2,
      },
      {
        lat: 37.26,
        lon: -122.19,
      },
    ]

    it(
      "keeps nearby environmental features",
      () => {
        const features = [
          {
            type: "way",
            id: 1,
            tags: {
              natural: "wood",
            },
            geometry: [
              {
                lat: 37.255,
                lon: -122.195,
              },
            ],
          },
          {
            type: "way",
            id: 2,
            tags: {
              natural: "wood",
            },
            geometry: [
              {
                lat: 38,
                lon: -121,
              },
            ],
          },
        ]

        const result =
          filterEnvironmentalFeatures(
            trailGeometry,
            features
          )

        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe(1)
      }
    )

    it(
      "includes environmental relations using member geometry",
      () => {
        const features = [
          {
            type: "relation",
            id: 10,
            tags: {
              natural: "wood",
            },
            members: [
              {
                type: "way",
                ref: 100,
                role: "outer",
                geometry: [
                  {
                    lat: 37.255,
                    lon: -122.195,
                  },
                ],
              },
            ],
          },
        ]

        const result =
          filterEnvironmentalFeatures(
            trailGeometry,
            features
          )

        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe(10)
      }
    )

    it(
      "returns no features for empty trail geometry",
      () => {
        const result =
          filterEnvironmentalFeatures(
            [],
            []
          )

        expect(result).toHaveLength(0)
      }
    )
  }
)
