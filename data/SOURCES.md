# Data sources and licenses

| Data | Source | License | Status |
|---|---|---|---|
| Rocket capacity to an 800 km sun-synchronous orbit from Vandenberg: Pegasus XL 190 kg, Falcon 9 (booster lands on drone ship) 10,670 kg | NASA Launch Services Program, Launch Vehicle Performance Website, https://elvperf.ksc.nasa.gov (query of 14 Nov 2026) | NASA content, US public domain | Used |
| Pegasus XL price: about $56.3M total cost to NASA, including services around the launch | NASA news release, launch contract for ICON, https://www.nasa.gov/news-release/nasa-awards-launch-services-contract-for-ionospheric-connection-explorer | NASA content, US public domain | Used |
| Falcon 9 price: about $69M, including launch services and other mission costs | NASA news release, launch contract for COSI, https://www.nasa.gov/news-release/nasa-awards-launch-services-contract-for-space-telescope-mission | NASA content, US public domain | Used |
| CubeSat unit: 10 cm cube, about 1 to 1.33 kg per 1U; sizes 1U to 12U | NASA, CubeSat 101: Basic Concepts and Processes for First-Time CubeSat Developers, https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf | NASA content, US public domain | Used for CubeSat bus mass |
| Rideshare price: NASA covers launch costs up to $300,000, typically enough for a 3U CubeSat to low Earth orbit | NASA, CubeSat 101 | NASA content, US public domain | Used |
| Split of CubeSat mass into bus and instruments (half each), CubeSat power, bus and instrument prices, masses and power | Game assumption | n/a | To be checked |
| Launch success rate Falcon 9: about 99.6 % (about 2 in-flight failures in more than 600 flights) | Public launch records, https://en.wikipedia.org/wiki/List_of_Falcon_9_and_Falcon_Heavy_launches | CC BY-SA (facts only, no text copied) | Used |
| Launch success rate Pegasus XL: 90 % (27 of 30 launches) | Public launch records, https://keeptrack.space/launches/vehicles/pegasus-xl (July 2026) | Facts only | Used |
| Starship payload: over 100 t to low Earth orbit (SpaceX claim, not NASA data; not for an 800 km orbit) | SpaceX Starship Users Guide (March 2020), reported by Space.com, https://www.space.com/spacex-starship-transportation-system-users-guide.html (the original PDF on spacex.com is offline) | Manufacturer claim, facts only | Used, marked "SpaceX claim" in the game |
| Starship price: $10M per flight is Elon Musk's target, not a real price | CNBC, 11 Feb 2022, https://www.cnbc.com/2022/02/11/elon-musk-spacexs-starship-is-solution-to-efficient-space-travel.html | Facts only | Used, marked "SpaceX claim" |
| Starship success rate: 67 % (10 of 15 test flights) | Public launch records, https://en.wikipedia.org/wiki/SpaceX_Starship (14 Nov 2026) | CC BY-SA (facts only, no text copied) | Used |
| Game assumption: no insurer covers Starship test flights; Starship only in the campaign, from contract 2 | Game design | — | Used |
| Success rate of the CubeSat rideshare (95 %), of your own rocket (75 % rising to 99 %, with quality program 85 % to 99.8 %), insurance price (8 % of the rocket) | Game assumption | n/a | Game assumption |
| Campaign: start money, contracts, client fees; reliability curve and quality program of your own rocket | Game design | n/a | Game assumption |
| Rocket equation, standard gravity 9.80665 m/s² | Physics (Tsiolkovsky) | n/a | Used for Orbiter-1 |
| Orbiter-1 (your own rocket): stage masses, specific impulse, price and how it gets cheaper | Game design, fictional rocket | n/a | Game assumption |

NASA prices are total costs to NASA and include more than the rocket itself. NASA logos are not used anywhere in this project.

## Space facts after a successful launch

All from NASA pages, fetched 14 Nov 2026, US public domain. Listed with each fact in `data/facts.js`:
ISS facts and figures (nasa.gov), James Webb mission page, Moon facts, Sun facts, Voyager 1 mission page, NASA library page on space debris (science.nasa.gov / nasa.gov).

## Background image

| What | Source | License | Status |
|---|---|---|---|
| "Cosmic Cliffs" in Carina, NIRCam, screen size, darkened with a CSS overlay | ESA/Webb, https://esawebb.org/images/weic2205a/, credit: NASA, ESA, CSA, and STScI | CC BY 4.0, credit shown on the home screen with a link | Used (`assets/webb-cosmic-cliffs.jpg`) |

## Campaign level 2

| What | Source | License | Status |
|---|---|---|---|
| Station modules (Level 2): masses 3,000 to 9,000 kg, build costs $25M to $55M, fees | Game assumption, not NASA data. Rocket capacity uses the NASA value for 800 km; a station flies lower, where real rockets carry more | — | Used |

## Campaign levels 3 and 4 (Moon, Mars)

| What | Source | License | Status |
|---|---|---|---|
| Falcon Heavy price: about $178M (launch services for Europa Clipper) | NASA news release, 23 Jul 2021, https://www.nasa.gov/news-release/nasa-awards-launch-services-contract-for-europa-clipper-mission/ | NASA content, US public domain | Used |
| Falcon Heavy payload to Mars: 16,800 kg (SpaceX figure). The game uses the same value for the Moon, which is conservative | https://en.wikipedia.org/wiki/Falcon_Heavy | CC BY-SA (facts only) | Used, marked as SpaceX figure |
| SLS Block 1 payload to the Moon: more than 27 t | NASA, SLS Lift Capabilities and Configurations, https://www.nasa.gov/wp-content/uploads/2020/02/sls_lift_capabilities_and_configurations_508_08202018_0.pdf | NASA content, US public domain | Used |
| SLS cost: about $2.2 billion per rocket ($4.1 billion per launch with Orion) | NASA Office of Inspector General, IG-22-003, https://oig.nasa.gov/docs/IG-22-003.pdf | NASA content, US public domain | Used ($2.2B) |
| Success rates of Falcon Heavy (99 %) and SLS (95 %); Moon and Mars modules, masses, build costs, fees; research effects (refueling, Moon ice -25 %, Mars fuel plant) | Game assumption | — | Game assumption |

## Satellite buses (changed 14 Nov 2026)

| What | Source | License | Status |
|---|---|---|---|
| Small bus 114 kg carrying 44 kg; medium bus 170 kg carrying 170 kg (two heritage configurations of Ball BCP-Small) | NASA RSDO Rapid IV catalog, Ball BCP Small data sheet, https://assets.science.nasa.gov/content/dam/science/cds/spacecraft-development/rsdo/rapid-iv-catalog/Ball_BCP_Small_Data%20Sheet.pdf | Published by NASA, numbers used as facts, no text or images copied | Used |
| Large bus 1,580 kg (2,190 kg space vehicle minus 610 kg payload) carrying 610 kg | NASA RSDO Rapid IV catalog, Ball BCP Large data sheet, https://assets.science.nasa.gov/content/dam/science/cds/spacecraft-development/rsdo/rapid-iv-catalog/Ball_BCP_Large_Data%20Sheet.pdf | Published by NASA, facts only | Used |
| Bus prices | Game assumption (RSDO does not publish prices) | — | Game assumption |

## Graphics

| What | Source | License | Status |
|---|---|---|---|
| Isometric buildings, domes, dishes, rover, craters, rocks, astronaut (20 images, cropped and scaled) | Kenney Space Kit 2.0, https://kenney.nl/assets/space-kit | CC0 1.0 (public domain, credit optional), license file in `assets/kenney/License.txt` | Used (`assets/kenney/`) |

## Bus power (changed 15 Nov 2026)

| What | Source | License | Status |
|---|---|---|---|
| Payload power: small bus 100 W, medium bus 90 W (Ball BCP-Small configurations), large bus 600 W orbit average (Ball BCP-Large). Bus masses already include their solar arrays, so extra wings are optional | NASA RSDO Rapid IV catalog, Ball BCP Small and BCP Large data sheets (URLs above) | NASA content, facts only | Used |
| Extra solar wings (mass, power, price) | Game assumption | — | Game assumption |


## Level 2: your own space station (added 15 Nov 2026)

| What | Source | License | Status |
|---|---|---|---|
| Food per crew member: about 1.8 kg per day including packaging. One round = 30 days = 54 kg per person | NASA Human Research Roadmap, https://humanresearchroadmap.nasa.gov/evidence/reports/food.pdf | NASA content, facts only | Used |
| Water and air are recycled on the station and not counted | Simplification | — | Game assumption |
| Crew seat price about $55M on Crew Dragon, launch included | NASA OIG estimate 2019, reported by Space.com, https://www.space.com/spacex-boeing-commercial-crew-seat-prices.html. NASA and Boeing say it is too high | Facts only | Used for the capsule price (rocket + capsule 100 M$ ≈ 56 M$ per seat with Falcon 9) |
| Capsule mass 9,500 kg | Simplified so a crew flight fits the 800 km payload numbers of the game | — | Game assumption |
| People fly only on rockets with at least 99 % success, robots with at least 90 % | Game rule | — | Game assumption |
| Astrobee: 32 cm cube, about 10 kg | NASA NTRS, https://ntrs.nasa.gov/api/citations/20180003326/downloads/20180003326.pdf | NASA content | Used |
| Robonaut 2: about 150 kg | IEEE Spectrum, https://spectrum.ieee.org/how-robonaut-2-will-help-astronauts-in-space | Facts only | Used |
| Dextre: 1,662 kg | Canadian Space Agency via Wikipedia, https://en.wikipedia.org/wiki/Dextre (MDA lists 1,710 kg) | Facts only | Used |
| Canadarm2: 1,800 kg | Canadian Space Agency (commonly cited) | Facts only | Used |
| Optimus: 57 kg | Tesla company figure, never flown in space | Company claim | Marked as claim |
| Module masses, prices, power, storage; robot prices, power and research points; partner payments; rescue cost; station max 80 t | — | — | Game assumption |
| 3D graphics | Three.js 0.170, https://threejs.org/ | MIT, `assets/vendor/three/LICENSE` | Used |
| Astronaut 3D model | Kenney Space Kit, https://kenney.nl/assets/space-kit | CC0 | Used (`assets/kenney3d/astronautA.glb`) |
| Battery: start 10, pack +20 (unit: kW for one round), pack 1,500 kg, $15M. Surplus power recharges it. Empty battery with crew aboard = rescue with the lifeboat | The ISS stores power in lithium-ion batteries for the time in Earth's shadow; sizes and prices here are simplified | — | Game assumption |
