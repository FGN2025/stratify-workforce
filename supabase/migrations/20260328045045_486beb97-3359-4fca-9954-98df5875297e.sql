
ALTER TABLE career_path_requirements ADD COLUMN IF NOT EXISTS game_title text;

UPDATE career_path_requirements SET game_title = 'ATS' WHERE career_path_id = 'cdl-class-a';
UPDATE career_path_requirements SET game_title = 'Fiber_Tech' WHERE career_path_id = 'fiber-technician';
UPDATE career_path_requirements SET game_title = 'Construction_Sim' WHERE career_path_id = 'heavy-equipment-operator';
UPDATE career_path_requirements SET game_title = 'Farming_Sim' WHERE career_path_id = 'ag-equipment-tech';
UPDATE career_path_requirements SET game_title = 'Mechanic_Sim' WHERE career_path_id = 'diesel-mechanic';
