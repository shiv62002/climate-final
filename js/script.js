const files = {
    temperature: "data/inputs/monthly-temperature-anomalies.csv",
    seaLevel: "data/inputs/sea-level_fig-1.csv",
    disasters: "data/inputs/number-of-natural-disaster-events.csv",
    food: "data/outputs/PFOODINDEXM.csv",
    wheat: "data/outputs/wheat-yield.csv",
    gdp: "data/outputs/global-gdp-over-the-long-run.csv"
  };
  
  let datasets = {};
  
  function averageByYear(data) {
    const grouped = d3.rollup(data, v => d3.mean(v, d => d.value), d => d.year);
    return Array.from(grouped, ([year, value]) => ({ year, value })).filter(d => !isNaN(d.year) && !isNaN(d.value));
  }
  
  async function loadData() {
    datasets.temperature = averageByYear((await d3.csv(files.temperature, d => {
      const year = parseInt(d.Day?.slice(0, 4));
      return { year, value: +d["Temperature anomaly"] };
    })).filter(d => d.year && isFinite(d.value)));
  
    const response = await fetch(files.seaLevel);
    const text = await response.text();
    const lines = text.split('\n').slice(6); // Skip metadata lines
    console.log("Detected CSV Header Line:", lines[0]);
    const parsed = d3.csvParse(lines.join('\n'));
    console.log("Sample row keys:", Object.keys(parsed[0]));
  
    datasets.seaLevel = parsed.map(d => {
      const year = +d["Year"];
      const value = +d["CSIRO - Adjusted sea level (inches)"];
      console.log("Parsed Sea Level Entry:", { year, value });
      return (!isNaN(year) && isFinite(value)) ? { year, value } : null;
    }).filter(Boolean);
  
    datasets.disasters = averageByYear((await d3.csv(files.disasters, d => {
      return { year: +d.Year, value: +d.Disasters };
    })).filter(d => d.year && isFinite(d.value)));
  
    datasets.food = averageByYear((await d3.csv(files.food, d => {
      return { year: parseInt(d.observation_date?.slice(0, 4)), value: +d.PFOODINDEXM };
    })).filter(d => d.year && isFinite(d.value)));
  
    datasets.wheat = averageByYear((await d3.csv(files.wheat, d => {
      return { year: +d.Year, value: +d["Wheat yield"] };
    })).filter(d => d.year && isFinite(d.value)));
  
    const rawGDP = (await d3.csv(files.gdp, d => ({ year: +d.Year, value: +d.GDP }))).filter(d => d.year && isFinite(d.value));
    datasets.gdp = [];
    for (let i = 1; i < rawGDP.length; i++) {
      const prev = rawGDP[i - 1], curr = rawGDP[i];
      if (curr.year >= 1960) {
        const pct = ((curr.value - prev.value) / prev.value) * 100;
        datasets.gdp.push({ year: curr.year, value: pct });
      }
    }
  }
  
  function drawChart() {
    const svg = d3.select("#chart"), tooltip = d3.select("#tooltip"), legend = d3.select("#legend");
    svg.selectAll("*").remove();
    legend.selectAll("*").remove();
  
    const width = 800, height = 400;
    const margin = { top: 20, right: 60, bottom: 50, left: 60 },
          w = width - margin.left - margin.right,
          h = height - margin.top - margin.bottom;
  
    const xKey = document.getElementById("x-select").value;
    const yKey = document.getElementById("y-select").value;
    const xLabel = document.querySelector(`#x-select option:checked`).textContent;
    const yLabel = document.querySelector(`#y-select option:checked`).textContent;
  
    const dataX = datasets[xKey], dataY = datasets[yKey];
    const merged = dataX.map(d => {
      const y = dataY.find(e => e.year === d.year);
      return y ? { year: d.year, x: d.value, y: y.value } : null;
    }).filter(Boolean);
  
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain(d3.extent(merged, d => d.year)).range([0, w]);
    const y1 = d3.scaleLinear().domain(d3.extent(merged, d => d.x)).range([h, 0]).nice();
    const y2 = d3.scaleLinear().domain(d3.extent(merged, d => d.y)).range([h, 0]).nice();
  
    g.append("g").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));
    g.append("g").call(d3.axisLeft(y1).ticks(5));
    g.append("g").attr("transform", `translate(${w},0)`).call(d3.axisRight(y2).ticks(5));
  
    g.append("text").attr("x", w / 2).attr("y", h + 40).attr("text-anchor", "middle").attr("font-size", "0.9rem").text("Year");
    g.append("text").attr("transform", "rotate(-90)").attr("x", -h / 2).attr("y", -45).attr("text-anchor", "middle").attr("font-size", "0.9rem").text(xLabel);
    g.append("text").attr("transform", "rotate(-90)").attr("x", -h / 2).attr("y", w + 45).attr("text-anchor", "middle").attr("font-size", "0.9rem").text(yLabel);
  
    const line1 = d3.line().x(d => x(d.year)).y(d => y1(d.x));
    const line2 = d3.line().x(d => x(d.year)).y(d => y2(d.y));
  
    const path1 = g.append("path").datum(merged).attr("fill", "none").attr("stroke", "#1c3d5a").attr("stroke-width", 2).attr("d", line1);
    const path2 = g.append("path").datum(merged).attr("fill", "none").attr("stroke", "#e66101").attr("stroke-width", 2).attr("d", line2);
  
    const len1 = path1.node().getTotalLength(), len2 = path2.node().getTotalLength();
    path1.attr("stroke-dasharray", len1).attr("stroke-dashoffset", len1);
    path2.attr("stroke-dasharray", len2).attr("stroke-dashoffset", len2);
  
    g.selectAll(".dot1").data(merged).enter().append("circle")
      .attr("cx", d => x(d.year)).attr("cy", d => y1(d.x)).attr("r", 3).attr("fill", "#1c3d5a")
      .on("mouseover", (e,d)=>tooltip.style("opacity",1).html(`${d.year}<br>${xLabel}: ${d.x.toFixed(2)}`).style("left",`${e.pageX+10}px`).style("top",`${e.pageY-28}px`))
      .on("mouseout", ()=>tooltip.style("opacity",0));
  
    g.selectAll(".dot2").data(merged).enter().append("circle")
      .attr("cx", d => x(d.year)).attr("cy", d => y2(d.y)).attr("r", 3).attr("fill", "#e66101")
      .on("mouseover", (e,d)=>tooltip.style("opacity",1).html(`${d.year}<br>${yLabel}: ${d.y.toFixed(2)}`).style("left",`${e.pageX+10}px`).style("top",`${e.pageY-28}px`))
      .on("mouseout", ()=>tooltip.style("opacity",0));
  
    path1.transition().duration(2000).ease(d3.easeLinear).attr("stroke-dashoffset", 0);
    path2.transition().duration(2000).ease(d3.easeLinear).attr("stroke-dashoffset", 0);
  
    legend.append("div").html(`<div class='legend-swatch' style='background:#1c3d5a'></div><span>${xLabel}</span>`);
    legend.append("div").html(`<div class='legend-swatch' style='background:#e66101'></div><span>${yLabel}</span>`);
  }
  
  d3.select("#playBtn").on("click", drawChart);
  d3.select("#x-select").on("change", drawChart);
  d3.select("#y-select").on("change", drawChart);
  loadData();
  