	import { StudentPersona } from "./StudentPersona";
		import {
			Unit,
			Assignment,
			Assessment,
			ProblemGroup,
			Problem,
			ProblemScore,
		} from "../domain";
    
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
