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
