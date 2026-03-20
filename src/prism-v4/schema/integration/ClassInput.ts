	import { StudentPersona } from "./StudentPersona";
    import { Unit } from "../domain/Unit";
    import { Assignment } from "../domain/Assignment";
    import { Assessment } from "../domain/Assessment";
    import { ProblemGroup } from "../domain/ProblemGroup";
    import { Problem } from "../domain/Problem";
    import { ProblemScore } from "../domain/ProblemScore";
    
    export interface ClassInput {
	  classId: string;
	  teacherId: string;
	  subject: string;
	  gradeLevel: number;
	
	  students: StudentPersona[];
	
	  units: Unit[];
	  assignments: Assignment[];
	  assessments: Assessment[];
	  problemGroups: ProblemGroup[];
	
	  problems: Problem[];          // includes ProblemTagVector inside
	  scores: ProblemScore[];
	}
