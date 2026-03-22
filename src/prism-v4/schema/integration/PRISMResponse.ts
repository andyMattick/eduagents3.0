import { StudentPersona } from "./StudentPersona";
import { ClassProfile } from "./ClassProfile";
import {
	AssignmentAggregate,
	UnitAggregate,
	ClassAggregate,
	JourneySummary,
	Insight,
	Recommendation,
	ReteachTarget,
} from "../view";
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
