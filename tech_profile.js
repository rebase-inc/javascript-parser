

class Exposure {

    constructor(first, last, total_reps) {
        if (typeof(first)==='undefined')        first = 0;
        if (typeof(last)==='undefined')         last = 0;
        if (typeof(total_reps)==='undefined')   total_reps = 0;

        this.first = first;
        this.last = last;
        this.total_reps = total_reps;
    }

    add(date, reps) {
        if ( (date < this.first) || (this.first == 0) ) {
            this.first = date;
        }
        if (date > this.last) {
            this.last = date;
        }
        this.total_reps += reps;
    }

    merge(exposure) {
        if (this.first == 0)                this.first = exposure.first;
        if (this.last == 0)                 this.last = exposure.last;
        if (exposure.first < this.first)    this.first = exposure.first;
        if (exposure.last > this.last)      this.last = exposure.last;
        this.total_reps += exposure.total_reps;
    }
}


class TechProfile {
    /*
     * same as api/rebase/skills/tech_profile.py
    */

    get(key) {
        if (this.hasOwnProperty(key)) {
            return this[key];
        }
        var newExposure = new Exposure();
        this[key] = newExposure;
        return newExposure;
    }

    add(component, date, reps) {
        this.get(component).add(date, reps);
    }

    merge(tech_profile) {
        Object.keys(tech_profile).forEach((component) => {
            this[component].merge(tech_profile[component]);
        });
    }
}


exports.TechProfile = TechProfile
exports.Exposure = Exposure
