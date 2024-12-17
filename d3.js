function updateChartDimensions() {
    const margin = { top: 20, right: 40, bottom: 60, left: 80 };
    const width = window.innerWidth - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom;

    // Clear the existing chart
    const svgContainer = d3.select("#scatterplot").select("svg");
    svgContainer.remove();

    // Append new SVG with updated dimensions
    const svg = d3.select("#scatterplot").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up tooltip (moving outside of event handlers for better performance)
    const tooltip = d3.select("#tooltip")
        .style("visibility", "hidden")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("padding", "5px")
        .style("border-radius", "5px");

    // Create audio element for preview (keep hidden by default)
    const audio = new Audio();
    audio.style.display = "none";

    // Variable to track the selected dot (for toggle functionality)
    let selectedDot = null;

    // Extract genres from URL query params
    const genres = getGenresFromUrl();

    // Load CSV data
    d3.csv("data/enao-genres.csv").then(data => {
        // Parse numeric values and set default color
        data.forEach(d => {
            d.top_pixel = +d.top_pixel;
            d.left_pixel = +d.left_pixel;
            d.font_size = +d.font_size;
            d.color = d.color || "#69b3a2"; // Default color if not specified
            d.genre_name = d.genre_name || ""; // Ensure genre_name exists for filtering
        });

        // Set scales for the scatter plot
        const x = d3.scaleLinear()
            .domain([d3.min(data, d => d.left_pixel) - 10, d3.max(data, d => d.left_pixel) + 10])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([d3.min(data, d => d.top_pixel) - 10, d3.max(data, d => d.top_pixel) + 10])
            .range([0, height]);

        // Scale font_size to circle radius
        const radius = d3.scaleSqrt()
            .domain([d3.min(data, d => d.font_size), d3.max(data, d => d.font_size)])
            .range([4, 16]);

        // Function to filter data based on search query
        function filterData(query) {
            return data.filter(d => d.genre_name.toLowerCase().includes(query.toLowerCase()));
        }

        // Create scatter plot circles (only once)
        function createScatterPlot(filteredData) {
            // Clear existing circles
            svg.selectAll(".dot").remove();

            // Create new circles based on filtered data
            const dots = svg.append("g")
                .selectAll(".dot")
                .data(filteredData)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.left_pixel))
                .attr("cy", d => y(d.top_pixel))
                .attr("r", d => radius(d.font_size))
                .attr("fill", d => d.color)
                .attr("opacity", 0.7)
                .on("mouseover", function(event, d) {
                    tooltip.style("visibility", "visible")
                        .html(`Genre: ${d.genre_name}`)
                        .style("top", `${event.pageY + 5}px`)
                        .style("left", `${event.pageX + 5}px`)
                        .style("background-color", d.color);
                })
                .on("mouseout", () => tooltip.style("visibility", "hidden"))
                .on("click", function(event, d) {
                    if (selectedDot === d) {
                        audio.pause();
                        selectedDot = null;
                        d3.select(this).classed("selected", false);
                    } else {
                        if (d.preview_url) {
                            audio.src = d.preview_url;
                            audio.play();
                        }
                        selectedDot = d;
                        d3.selectAll(".dot").classed("selected", false);
                        d3.select(this).classed("selected", true);
                    }
                });
        }

        // Contour update logic
        function updateContours(filteredData) {
            // Clear existing contours
            svg.selectAll(".contour").remove();

            // Set up the contour density function with dynamic bandwidth
            const density = d3.contourDensity()
                .x(d => x(d.left_pixel))
                .y(d => y(d.top_pixel))
                .size([width, height])
                .thresholds(30)  // Adjust this value to fine-tune the contour density
                .bandwidth(40);  // Adjust for smoother or more detailed contours

            // Generate contours based on filtered data
            const contours = density(filteredData);

            // Create contour paths with transition for smooth updates
            const contourGroup = svg.append("g").attr("class", "contour-group");

            contourGroup.selectAll(".contour")
                .data(contours)
                .enter().append("path")
                .attr("class", "contour")
                .attr("d", d3.geoPath())
                .attr("stroke-width", 2)
                .attr("stroke", d => d3.scaleLinear()
                    .domain(d3.extent(contours, d => d.value))
                    .range(["#06D6A0", "#EF476F"])(d.value))
                .attr("stroke-linejoin", "round")
                .style("fill", d => d3.scaleLinear()
                    .domain(d3.extent(contours, d => d.value))
                    .range(["#06D6A0", "#EF476F"])(d.value).replace(")", ", 0.025)"))
                .transition()
                .duration(500)  // Apply transition for smooth contour changes
                .style("opacity", 0.7);
        }

        // Event listener for the genre search input
        const genreSearchInput = document.getElementById("genre-search");
        genreSearchInput.addEventListener("input", () => {
            const searchQuery = genreSearchInput.value;
            let filteredData = filterData(searchQuery);  // Use this filteredData for all scenarios
        
            // Re-render scatter plot
            createScatterPlot(filteredData);
        
            if (searchQuery === "") {
                // If the search input is empty, use cleanData filtered by genre
                filteredData = genres.length > 0 ? data.filter(d => genres.includes(d.genre_name)) : data;
            }
            
            // Update contours if maskToggle is checked and filteredData is available
            if (maskToggle.checked) {
                updateContours(filteredData);
            }
        });

        // Event listener for the mask toggle
        const maskToggle = document.getElementById("toggle-mask");
        maskToggle.addEventListener("change", () => {
            // Filter data based on search query or use the genres
            let filteredData = genreSearchInput.value ? filterData(genreSearchInput.value) : genres.length > 0 ? data.filter(d => genres.includes(d.genre_name)) : data;
        
            // Update contours if the maskToggle is checked
            if (maskToggle.checked) {
                updateContours(filteredData);  // Show contours based on filtered data
            } else {
                svg.selectAll(".contour").remove();  // Hide contours
            }
        });

        // Initial scatter plot render with all data
        createScatterPlot(data);

        // Initial contour render if toggle is checked
        if (maskToggle.checked) {
            let filteredData = genreSearchInput.value ? filterData(genreSearchInput.value) : genres.length > 0 ? data.filter(d => genres.includes(d.genre_name)) : data;
            updateContours(filteredData);
        }

        // Helper function to create axes
        function createAxis(axis, orientation, transform) {
            svg.append("g")
                .attr("class", `${orientation}-axis`)
                .attr("transform", transform)
                .call(axis)
                .selectAll(".domain").remove();
        }

        // Clear button functionality
        document.getElementById("clear-button").addEventListener("click", () => {
            document.getElementById("genre-search").value = '';
            const filteredData = genres.length > 0 ? data.filter(d => genres.includes(d.genre_name)) : data;
            
            createScatterPlot(data);
            
            if (maskToggle.checked) {
                updateContours(filteredData);
            }
            
        });

        // Create x-axis and y-axis
        const xAxis = d3.axisBottom(x).ticks(5).tickSize(0).tickFormat(() => "");
        createAxis(xAxis, 'x', `translate(0, ${height})`);

        const yAxis = d3.axisLeft(y).ticks(5).tickSize(0).tickFormat(() => "");
        createAxis(yAxis, 'y', "");

        // Add axis labels
        svg.append("text")
            .attr("class", "axis-label")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .style("text-anchor", "middle")
            .style("font-family", "Arial, sans-serif")
            .style("font-weight", "bold")
            .style("font-size", "16px")
            .text("← Denser & Atmospheric, Spikier & Bouncier →");

        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 20)
            .style("text-anchor", "middle")
            .style("font-family", "Arial, sans-serif")
            .style("font-weight", "bold")
            .style("font-size", "16px")
            .text("← Organic, Mechanical & Electric →");
    });
}

// Function to handle Spotify login redirect
function loginToSpotify() {
    window.location.href = 'http://localhost:5000/login'; // Update with your backend URL
}

// Function to extract genres from URL query params
function getGenresFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const genresString = urlParams.get('genres');
    return genresString ? genresString.split(',') : [];
}

// Initial chart render
updateChartDimensions();

// Window resize event for responsiveness
window.addEventListener("resize", updateChartDimensions);