'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const clearAllBtn = document.querySelector('.clear_all-btn');
const clearAllPopUp = document.querySelector('.clearall_popup');
const overlay = document.querySelector('.overlay');
const clearAllPopUpYesBtn = document.querySelector('.btn-yes');
const clearAllPopUpNoBtn = document.querySelector('.btn-no');
const overview = document.querySelector('.Overview');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December',];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  #markers = [];

  constructor() {
    //Get user's position
    this._getPosition();

    //Get data from local stoarage
    this._getLocalStorage();

    //Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    //for deleting single workout list
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));

    //for hiding dropdown when clicked on anywhere
    document.addEventListener(
      'click',
      this._hideDropdownOnClickOutside.bind(this)
    );

    //For Editing form
    containerWorkouts.addEventListener(
      'click',
      this._handleEditClick.bind(this)
    );

    //For show clear all popup
    clearAllBtn.addEventListener('click', this._showDeleteAllPopup.bind(this));

    //for deleting all workouts
    clearAllPopUpYesBtn.addEventListener(
      'click',
      this._confirmDeleteAll.bind(this)
    );

    //For cancel deleting all workout
    clearAllPopUpNoBtn.addEventListener(
      'click',
      this._cancelDeleteAll.bind(this)
    );

    //for showing all markers with zoom out
    overview.addEventListener('click', this._overview.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling click on map
    this.#map.on('click', this._showForm.bind(this));

    //Rendering markers of stored workouts when map loads
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      //Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If workout cycling, create Cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      //Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new object to workout Array
    this.#workouts.push(workout);

    //Render workout on map as marker
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);

    //Hide form + Clear input fields
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    // Store marker with workout id
    this.#markers.push({ id: workout.id, marker });
  }

  // <div class="heading-dots">
  //       <h2 class="workout__title">${workout.description}</h2>
  //         <div class="options">
  //           <i class="fa-solid fa-ellipsis three-dots"></i>
  //         </div>

  _renderWorkout(workout) {
    console.log(this.#workouts);
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">  
      <div class="heading-dots">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="options">
          <i class="fa-solid fa-ellipsis three-dots"></i>
          <div class="dropdown hidden">
            <div class="first">
              <i class="fa-solid fa-pen dropdown-icon"></i>
              <p class="icon-title">Edit form</p>
            </div>
            <div class="first second">
              <i class="fa-solid fa-trash dropdown-icon"></i>
              <p class="icon-title">Delete this list</p>
            </div>
          </div>
        </div>
      </div>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
           `;

    if (workout.type === 'running')
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div> </li>`;

    if (workout.type === 'cycling')
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
          `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    //JSON.stringify is to convert object into string
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  //For deleting single workout list
  _deleteWorkout(e) {
    const deleteBtn = e.target.closest('.second');
    if (!deleteBtn) return;

    const workoutEl = deleteBtn.closest('.workout');
    if (!workoutEl) return;

    // Remove from DOM
    workoutEl.remove();

    // Remove from data array
    this.#workouts = this.#workouts.filter(
      work => work.id !== workoutEl.dataset.id
    );

    // Remove associated marker from map and array
    const markerObj = this.#markers.find(m => m.id === workoutEl.dataset.id);
    if (markerObj) {
      this.#map.removeLayer(markerObj.marker);
      this.#markers = this.#markers.filter(m => m.id !== workoutEl.dataset.id);
    }

    // Update localStorage
    this._setLocalStorage();
  }

  //For hiding dropdown menu when clicked on elsewhere
  _hideDropdownOnClickOutside(e) {
    const clickedInsideDropdown = e.target.closest('.dropdown');
    const clickedDots = e.target.closest('.three-dots');

    if (!clickedInsideDropdown && !clickedDots) {
      document
        .querySelectorAll('.dropdown')
        .forEach(drop => drop.classList.add('hidden'));
      document
        .querySelectorAll('.three-dots')
        .forEach(dot => (dot.style.display = 'inline'));
    }
  }

  //For Editing form and render it on list
  _handleEditClick(e) {
    const editBtn = e.target.closest('.first:not(.second)');
    if (!editBtn) return;

    const workoutEl = editBtn.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);
    if (!workout) return;

    // 🔴 DELETE the workout from DOM, array, and map
    document.querySelector(`[data-id="${workout.id}"]`).remove();

    const markerObj = this.#markers.find(m => m.id === workout.id);
    if (markerObj) {
      this.#map.removeLayer(markerObj.marker);
      this.#markers = this.#markers.filter(m => m.id !== workout.id);
    }

    this.#workouts = this.#workouts.filter(w => w.id !== workout.id);
    this._setLocalStorage();

    // Now open the form with old values
    inputType.value = workout.type;
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;

    if (workout.type === 'running') {
      inputCadence.value = workout.cadence;
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
    } else {
      inputElevation.value = workout.elevationGain;
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
    }

    form.classList.remove('hidden');
    inputDistance.focus();
  }

  //For show clear all popup
  _showDeleteAllPopup() {
    clearAllPopUp.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }

  //for deleting all workouts
  _confirmDeleteAll() {
    // Remove all workouts from DOM
    document.querySelectorAll('.workout').forEach(w => w.remove());

    // Remove all markers from map
    this.#markers.forEach(m => this.#map.removeLayer(m.marker));
    this.#markers = [];

    // Clear the workouts array
    this.#workouts = [];

    // Update localStorage
    this._setLocalStorage();

    // Hide popup
    clearAllPopUp.classList.add('hidden');
    overlay.classList.add('hidden');
  }

  //For cancel deleting all workout
  _cancelDeleteAll() {
    // Just hide popup
    clearAllPopUp.classList.add('hidden');
    overlay.classList.add('hidden');
  }

  //for showing all markers with zoom out
  _overview() {
    // if there are no workouts return
    if (this.#workouts.length === 0) return;

    // find lowest and highest lat and long to make map bounds that fit all markers
    const latitudes = this.#workouts.map(w => {
      return w.coords[0];
    });
    const longitudes = this.#workouts.map(w => {
      return w.coords[1];
    });
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLong = Math.min(...longitudes);
    const maxLong = Math.max(...longitudes);
    // fit bounds with coordinates
    this.#map.fitBounds(
      [
        [maxLat, minLong],
        [minLat, maxLong],
      ],
      { padding: [70, 70] }
    );
  }
}

const app = new App();

// Event delegation for dynamically created .three-dots icons
containerWorkouts.addEventListener('click', function (e) {
  const dotIcon = e.target.closest('.three-dots');
  if (!dotIcon) return;

  // Find the dropdown next to the clicked icon
  const optionsDiv = dotIcon.parentElement;
  const dropdown = optionsDiv.querySelector('.dropdown');

  // Hide the icon and show the dropdown
  dotIcon.style.display = 'none';
  dropdown.classList.remove('hidden');
});

overlay.addEventListener('click', function () {
  clearAllPopUp.classList.add('hidden');
  overlay.classList.add('hidden');
});
