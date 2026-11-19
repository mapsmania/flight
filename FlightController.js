
export default class FlightController {
    constructor(map, options = {}) {
        this.map = map;

        // Speed is measured in metres per second
        this.speed = options.speed ?? 60;
        this.minSpeed = options.minSpeed ?? 0;
        this.maxSpeed = options.maxSpeed ?? 250;

        this.bearing = options.bearing ?? map.getBearing();

        // Map camera pitch, not aircraft pitch
        this.pitch = options.pitch ?? map.getPitch();
        this.pitchMin = options.pitchMin ?? 30;
        this.pitchMax = options.pitchMax ?? 85;

        this.speedStep = options.speedStep ?? 2.78; // 10 km/h
        this.turnRate = options.turnRate ?? 2;

        this.running = false;
        this.lastTime = null;

        this._loop = this._loop.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
    }

    start() {
        if (this.running) return;

        this.running = true;
        this.lastTime = null;

        window.addEventListener('keydown', this._onKeyDown);

        requestAnimationFrame(this._loop);
    }

    stop() {
        this.running = false;
        this.lastTime = null;

        window.removeEventListener('keydown', this._onKeyDown);
    }

    // Calculate a new geographic position after travelling
    // a specified distance along a specified bearing.
    destination(lng, lat, distance, bearing) {
        const R = 6371000;

        const d = distance / R;
        const theta = bearing * Math.PI / 180;

        const phi1 = lat * Math.PI / 180;
        const lambda1 = lng * Math.PI / 180;

        const phi2 = Math.asin(
            Math.sin(phi1) * Math.cos(d) +
            Math.cos(phi1) * Math.sin(d) * Math.cos(theta)
        );

        const lambda2 = lambda1 + Math.atan2(
            Math.sin(theta) * Math.sin(d) * Math.cos(phi1),
            Math.cos(d) - Math.sin(phi1) * Math.sin(phi2)
        );

        return [
            lambda2 * 180 / Math.PI,
            phi2 * 180 / Math.PI
        ];
    }

    _loop(timestamp) {
        if (!this.running) return;

        if (this.lastTime === null) {
            this.lastTime = timestamp;
        }

        // Time since the previous frame, in seconds.
        // Clamp it to avoid a large jump after a browser pause.
        const deltaTime = Math.min(
            (timestamp - this.lastTime) / 1000,
            0.1
        );

        this.lastTime = timestamp;

        const center = this.map.getCenter();

        // Distance travelled during this frame
        const distance = this.speed * deltaTime;

        const [lng, lat] = this.destination(
            center.lng,
            center.lat,
            distance,
            this.bearing
        );

        this.map.jumpTo({
            center: [lng, lat],
            bearing: this.bearing,
            pitch: this.pitch
        });

        requestAnimationFrame(this._loop);
    }

    _onKeyDown(e) {
        const key = e.key.toLowerCase();

        const flightKeys = [
            'arrowup',
            'arrowdown',
            'arrowleft',
            'arrowright',
            'w',
            's'
        ];

        if (flightKeys.includes(key)) {
            e.preventDefault();
        }

        switch (key) {
            case 'arrowup':
                this.speed = Math.min(
                    this.speed + this.speedStep,
                    this.maxSpeed
                );
                break;

            case 'arrowdown':
                this.speed = Math.max(
                    this.speed - this.speedStep,
                    this.minSpeed
                );
                break;

            case 'arrowleft':
                this.bearing -= this.turnRate;
                break;

            case 'arrowright':
                this.bearing += this.turnRate;
                break;

            case 'w':
                this.pitch = Math.min(
                    this.pitch + 2,
                    this.pitchMax
                );
                break;

            case 's':
                this.pitch = Math.max(
                    this.pitch - 2,
                    this.pitchMin
                );
                break;
        }
    }

    setSpeed(speed) {
        this.speed = Math.max(
            this.minSpeed,
            Math.min(speed, this.maxSpeed)
        );
    }

    setBearing(bearing) {
        this.bearing = bearing;
    }

    setPitch(pitch) {
        this.pitch = Math.max(
            this.pitchMin,
            Math.min(pitch, this.pitchMax)
        );
    }
}
