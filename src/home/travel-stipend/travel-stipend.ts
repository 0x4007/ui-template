interface StipendBreakdown {
  conference: string;
  location: string;
  distance_km: number;
  flight_cost: number;
  lodging_cost: number;
  meals_cost: number;
  ticket_price: number;
  total_stipend: number;
}

const COST_PER_KM = 0.2;
const BASE_LODGING_PER_NIGHT = 150;
const BASE_MEALS_PER_DAY = 50;
const DEFAULT_TICKET_PRICE = 1000;

export function renderTravelStipendCalculator() {
  const modal = document.getElementById("preview-modal");
  const container = document.getElementById("preview-body-inner");
  if (!container || !modal) return;

  // Show the modal
  modal.classList.add("active");
  document.body.classList.add("preview-active");

  // Clear existing content
  container.innerHTML = "";

  // Create form
  const form = document.createElement("form");
  form.className = "travel-stipend-form";
  form.innerHTML = `
    <div class="form-group">
      <label for="conference">Conference Name</label>
      <input type="text" name="conference" id="conference" required>
    </div>
    <div class="form-group">
      <label for="location">Location</label>
      <input type="text" name="location" id="location" required placeholder="e.g., Tokyo, Japan">
    </div>
    <div class="form-group">
      <label for="start">Start Date</label>
      <input type="date" name="start" id="start" required>
    </div>
    <div class="form-group">
      <label for="end">End Date</label>
      <input type="date" name="end" id="end">
    </div>
    <div class="form-group">
      <label for="ticketPrice">Ticket Price (USD)</label>
      <input type="number" name="ticketPrice" id="ticketPrice" placeholder="${DEFAULT_TICKET_PRICE}">
    </div>
    <button type="submit">Calculate Stipend</button>
  `;

  // Create results container
  const results = document.createElement("div");
  results.className = "stipend-results";
  results.style.display = "none";

  // Handle form submission
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    // Get form values directly from elements to ensure proper date handling
    const conference = (form.querySelector("#conference") as HTMLInputElement).value;
    const location = (form.querySelector("#location") as HTMLInputElement).value;
    const start = (form.querySelector("#start") as HTMLInputElement).value;
    const end = (form.querySelector("#end") as HTMLInputElement).value;
    const ticketPrice = (form.querySelector("#ticketPrice") as HTMLInputElement).value;

    // Parse dates correctly
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    // Calculate number of nights
    const numberOfNights = endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 2; // Default to 3 days (2 nights) if no end date
    const numberOfMealDays = numberOfNights + 1;

    // Simplified distance calculation (would normally use haversine formula)
    const distanceKm = 1000; // Example distance

    const breakdown: StipendBreakdown = {
      conference,
      location,
      distance_km: distanceKm,
      flight_cost: distanceKm * COST_PER_KM,
      lodging_cost: BASE_LODGING_PER_NIGHT * numberOfNights,
      meals_cost: BASE_MEALS_PER_DAY * numberOfMealDays,
      ticket_price: ticketPrice ? parseFloat(ticketPrice) : DEFAULT_TICKET_PRICE,
      total_stipend: 0,
    };

    breakdown.total_stipend = breakdown.flight_cost + breakdown.lodging_cost + breakdown.meals_cost + breakdown.ticket_price;

    // Display results
    results.style.display = "block";
    results.innerHTML = `
      <h2>Stipend Breakdown for ${breakdown.conference}</h2>
      <div class="breakdown">
        <div class="breakdown-item">
          <span>Flight Cost:</span>
          <span>$${breakdown.flight_cost.toFixed(2)}</span>
        </div>
        <div class="breakdown-item">
          <span>Lodging Cost:</span>
          <span>$${breakdown.lodging_cost.toFixed(2)}</span>
        </div>
        <div class="breakdown-item">
          <span>Meals Cost:</span>
          <span>$${breakdown.meals_cost.toFixed(2)}</span>
        </div>
        <div class="breakdown-item">
          <span>Ticket Price:</span>
          <span>$${breakdown.ticket_price.toFixed(2)}</span>
        </div>
        <div class="breakdown-item total">
          <span>Total Stipend:</span>
          <span>$${breakdown.total_stipend.toFixed(2)}</span>
        </div>
      </div>
    `;
  });

  container.appendChild(form);
  container.appendChild(results);

  // Update modal title
  const previewTitle = document.getElementById("preview-title");
  if (previewTitle) {
    previewTitle.textContent = "Travel Stipend Calculator";
  }
}
