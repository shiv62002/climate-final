const svg = d3.select("#map");
  const tooltip = d3.select("#tooltip");
  const legend = d3.select("#legend");
  const yearSlider = document.getElementById("yearSlider");
  const yearLabel = document.getElementById("yearLabel");
  const datasetSelect = document.getElementById("datasetSelect");

  const projection = d3.geoNaturalEarth1()
    .scale(window.innerWidth / 6.3)
    .translate([window.innerWidth / 2, window.innerHeight / 2]);

  const path = d3.geoPath().projection(projection);

  let world = null;
  let countryNameToCode = {};
  let colorScale = null;

  let dataByVariable = {
    gdp: new Map(),
    wheat: new Map(),
    temperature: new Map(),
    foodInflation: new Map(),
    disasterDamage: new Map()
  };
  let gdpUsdByYear = {};
  for (let y = 2000; y <= 2022; y++) {
    gdpUsdByYear[y] = new Map();
  }


  function formatBillionsOrTrillions(val) {
    if (val >= 1e12) return (val / 1e12).toFixed(2) + " Trillion USD";
    if (val >= 1e9) return (val / 1e9).toFixed(2) + " Billion USD";
    if (val >= 1e6) return (val / 1e6).toFixed(2) + " Million USD";
    return val.toLocaleString() + " USD";
  }



  function updateMap(variable, year) {
    const dataMap = dataByVariable[variable].get(year) || new Map();
    const values = Array.from(dataMap.values()).filter(v => isFinite(v));
    colorScale = d3.scaleSequential()
      .domain(d3.extent(values))
      .interpolator(d3.interpolateYlGnBu);

    svg.selectAll("path")
      .data(world.features.filter(f => f.id !== "ATA"))
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        const val = dataMap.get(d.id);
        return val != null ? colorScale(val) : "#eee";
      })
      .attr("stroke", "#ccc")
      .on("mousemove", (event, d) => {
        const val = dataMap.get(d.id);
        const variable = datasetSelect.value;
        const label = datasetSelect.options[datasetSelect.selectedIndex].text;

        let displayVal = "No data";
        if (val != null) {
          if (variable === "gdp") {
            const rawGdp = gdpUsdByYear[year]?.get(d.id);
            const gdpFormatted = rawGdp ? formatBillionsOrTrillions(rawGdp) : "N/A";
            displayVal = `${val.toFixed(2)}%<br><strong>GDP:</strong> ${gdpFormatted}`;
          } else {
            displayVal = val.toFixed(4);
          }
        }

        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.properties.name}</strong><br>${label} (${year}): ${displayVal}`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })


      .on("mouseout", () => tooltip.style("opacity", 0))
      .on("click", (event, d) => {
        const code = d.id;
        if (code) {
          window.location.href = `country.html?code=${code}`;
        }
      });


    updateLegend(colorScale, datasetSelect.options[datasetSelect.selectedIndex].text);
  }

  function updateLegend(scale, label) {
    const steps = 10;
    const min = scale.domain()[0];
    const max = scale.domain()[1];
    legend.html(`<strong>${label}</strong>: ${min.toFixed(4)} → ${max.toFixed(4)}&nbsp;`);
    for (let i = 0; i <= steps; i++) {
      const val = min + (i / steps) * (max - min);
      legend.append("div")
        .attr("class", "legend-box")
        .style("background-color", scale(val));
    }
  }

  function parseGdpData(rows) {
    for (let y = 2000; y <= 2022; y++) dataByVariable.gdp.set(y, new Map());
    rows.forEach(d => {
      const code = d["Country Code"];
      for (let y = 2000; y <= 2022; y++) {
        const val = +d[y];
        if (!isNaN(val)) {
          dataByVariable.gdp.get(y).set(code, val);
        }
      }
    });
  }

  function parseWheatData(rows) {
    for (let y = 2000; y <= 2022; y++) dataByVariable.wheat.set(y, new Map());
    rows.forEach((d, i) => {
      const name = (d.Entity || "").trim().toLowerCase();
      const year = +d.Year;
      const valKey = Object.keys(d).find(k => k.toLowerCase().includes("wheat") && k.toLowerCase().includes("yield"));
      const val = +d[valKey];
      const code = countryNameToCode[name];
      if (code && !isNaN(val) && year >= 2000 && year <= 2022) {
        dataByVariable.wheat.get(year).set(code, val);
      }
    });
  }

  function parseTemperatureData(rows) {
    for (let y = 2000; y <= 2022; y++) dataByVariable.temperature.set(y, new Map());
    rows.forEach(row => {
      const year = parseInt(row.Day.slice(0, 4));
      const code = row.Code;
      const val = +row["Temperature anomaly"];
      if (year >= 2000 && year <= 2022 && code && !isNaN(val)) {
        if (!dataByVariable.temperature.get(year).has(code)) {
          dataByVariable.temperature.get(year).set(code, []);
        }
        dataByVariable.temperature.get(year).get(code).push(val);
      }
    });
    for (let y = 2000; y <= 2022; y++) {
      const avgMap = new Map();
      for (const [code, arr] of dataByVariable.temperature.get(y).entries()) {
        avgMap.set(code, d3.mean(arr));
      }
      dataByVariable.temperature.set(y, avgMap);
    }
  }

  function parseFoodInflation(rows) {
    for (let y = 2000; y <= 2022; y++) dataByVariable.foodInflation.set(y, new Map());
    rows.forEach(d => {
      const code = d["Country Code"];
      for (let y = 2000; y <= 2022; y++) {
        const val = +d[y];
        if (!isNaN(val)) {
          dataByVariable.foodInflation.get(y).set(code, val);
        }
      }
    });
  }

  function parseDisasterDamage(rows) {
    const yearKey = Object.keys(rows[0]).find(k => k.toLowerCase() === "year");
    const codeKey = Object.keys(rows[0]).find(k => k.toLowerCase().includes("code"));
    const valueKey = Object.keys(rows[0]).find(k => k.toLowerCase().includes("damage") && k.toLowerCase().includes("gdp"));

    if (!yearKey || !codeKey || !valueKey) {
      console.error("Missing expected columns. Found keys:", Object.keys(rows[0]));
      return;
    }

    for (let y = 2000; y <= 2022; y++) dataByVariable.disasterDamage.set(y, new Map());

    rows.forEach((row, i) => {
      const code = row[codeKey];
      const year = +row[yearKey];
      const val = +row[valueKey];

      if (!code || isNaN(val) || isNaN(year)) {
        if (i < 10) {
          console.warn(`[Row ${i}] Skipped → Code: ${code}, Year: ${row[yearKey]}, Value: ${row[valueKey]}`);
        }
        return;
      }

      if (year >= 2000 && year <= 2022) {
        dataByVariable.disasterDamage.get(year).set(code, val);
      }
    });

  }

  Promise.all([
    d3.json("data/world.json"),
    d3.json("data/countryNameToCode.json"),
    fetch("data/API_NY.GDP.MKTP.KD.ZG_DS2_en_csv_v2_85160.csv").then(r => r.text()).then(t => d3.csvParse(t.split("\n").slice(4).join("\n"))),
    d3.csv("data/wheat-yield.csv"),
    d3.csv("data/monthly-temperature-anomalies.csv"),
    fetch("data/GDP_Dollar.csv").then(r => r.text()).then(t => d3.csvParse(t.split("\n").slice(4).join("\n"))),
    fetch("data/API_FP.CPI.TOTL.ZG_DS2_en_csv_v2_85166.csv").then(r => r.text()).then(t => d3.csvParse(t.split("\n").slice(4).join("\n"))),
    d3.csv("data/economic-damages-from-natural-disasters-as-a-share-of-gdp.csv")
  ]).then(([worldData, codeMap, gdpCsv, wheatCsv, tempCsv, gdpUsdCsv, foodCsv, disasterCsv]) => {
    world = worldData;
    gdpUsdCsv.forEach(d => {
      const code = d["Country Code"];
      for (let y = 2000; y <= 2022; y++) {
        const val = +d[y];
        if (!isNaN(val)) {
          gdpUsdByYear[y].set(code, val);
        }
      }
    });
    countryNameToCode = {};
    for (const [name, code] of Object.entries(codeMap)) {
      countryNameToCode[name.trim().toLowerCase()] = code;
    }

    parseGdpData(gdpCsv);
    parseWheatData(wheatCsv);
    parseTemperatureData(tempCsv);
    parseFoodInflation(foodCsv);
    parseDisasterDamage(disasterCsv);
    updateMap("gdp", +yearSlider.value);
  });

  yearSlider.addEventListener("input", () => {
    yearLabel.textContent = yearSlider.value;
    updateMap(datasetSelect.value, +yearSlider.value);
  });

  datasetSelect.addEventListener("change", () => {
    updateMap(datasetSelect.value, +yearSlider.value);
  });