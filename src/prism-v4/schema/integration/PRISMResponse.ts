import { StudentPersona } from "./StudentPersona";
import { ClassProfile } from "./ClassProfile";
import { AssignmentAggregate } from "./AssignmentAggregate";
import { UnitAggregate } from "./UnitAggregate";
import { ClassAggregate } from "./ClassAggregate";
import { JourneySummary } from "./JourneySummary";
import { Insight } from "./Insight";
import { Recommendation } from "./Recommendation";
import { ReteachTarget } from "./ReteachTarget";
import { DifficultyInference } from "./DifficultyInference";


export interface PRISMResponse {
	  // Updated personas
	  students: StudentPersona[];
	  classProfile: ClassProfile;
	
	  // Aggregates
	  assignmentAggregates?: AssignmentAggregate[];
	  unitAggregates?: UnitAggregate[];
	  classAggregate?: ClassAggregate;
	
	  // Journeys (if requested)
	  journeys?: JourneySummary[];
	
	  // Insights & recommendations
	  insights?: Insight[];
	  recommendations?: Recommendation[];
	  reteachTargets?: ReteachTarget[];
	
	  // Difficulty inferences (optional)
	  difficultyInferences?: DifficultyInference[];
	}
