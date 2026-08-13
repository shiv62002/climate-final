# Climate-Economy Interactive Visualization

Live Page: [Climate Dashboard](https://shiv62002.github.io/Climate-Economy-Dashboard/)

This project presents an interactive visualization platform that explores how climate-related changes influence economic outcomes across countries and over time. The site connects long-term climate variables such as temperature anomalies and natural disasters with economic indicators including GDP growth, wheat yield, food-price inflation, and damages as a share of GDP. The interface enables both global-level and country-specific analysis through maps, charts, and time-series comparisons.

## Behind the Scenes

The goal of this project was to build an interactive dashboard that reveals possible relationships between climate trends and economic performance over time, both globally and by nation. We gathered, cleaned, and unified roughly two decades of data from multiple sources to make it possible to visualize, compare, and interpret indicators side by side.

A key challenge was determining how to structure the visual narrative while maintaining usability and interactivity. We implemented D3.js-based maps and charts that respond to user input through dropdowns, sliders, animations, and tooltips. Another difficulty was selecting datasets that meaningfully connect climate conditions to economic outcomes, while still giving users the freedom to draw their own conclusions. By incorporating variables such as wheat yield and natural-disaster-related economic losses, alongside GDP growth and climate trends, the visualizations allow for investigation of potential correlations without imposing rigid interpretations.

## How to Use the Site

When opening the main page, an interactive global heat map appears. Use the dropdown to select the variable of interest (GDP growth, wheat yield, temperature anomaly, food-price inflation, or disaster damages as a share of GDP). Use the year slider to explore how each country's values change between 2000 and 2022.

Clicking a country loads a dedicated page for that nation, displaying interactive line charts for two selected indicators across the entire 2000–2022 period. Hovering over points reveals exact values, allowing users to compare patterns over time. A link in the site header provides access to global visualizations that show long-term climate and economic changes at the worldwide level rather than country by country.

## Acknowledgements

### Country-Level Data Sources

Economic Damages from Natural Disasters (% of GDP): Our World in Data  
https://ourworldindata.org/natural-disasters

Wheat Yield (tons/hectare): Our World in Data  
https://ourworldindata.org/grapher/wheat-yields?time=1755

Annual GDP Growth & Values (constant USD): World Bank  
https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG

Consumer Price Inflation (%): World Bank  
https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG

Monthly Temperature Anomalies (°C): Our World in Data  
https://ourworldindata.org/grapher/monthly-temperature-anomalies

### Global Datasets

Annual Deaths from Natural Disasters: Our World in Data  
https://ourworldindata.org/grapher/number-of-deaths-from-natural-disasters?time=1926..latest

Global GDP Over the Long Run: Our World in Data  
https://ourworldindata.org/grapher/global-gdp-over-the-long-run

Number of Natural Disaster Events per Year: Our World in Data  
https://ourworldindata.org/grapher/number-of-natural-disaster-events

Global Food Price Index: Federal Reserve Economic Data  
https://fred.stlouisfed.org/series/PFOODINDEXM

Wheat Yield (tons/hectare): Our World in Data  
https://ourworldindata.org/grapher/wheat-yields?time=1755

Global Rise in Sea Levels: U.S. Environmental Protection Agency  
https://www.epa.gov/climate-indicators/climate-change-indicators-sea-level
