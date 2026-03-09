-- Cognitive decay: strength score for memory relevance weighting
-- Piecewise hybrid decay (Wixted 1991) with LTP for frequently-accessed memories
ALTER TABLE thoughts ADD COLUMN strength REAL NOT NULL DEFAULT 1.0;
ALTER TABLE decisions ADD COLUMN strength REAL NOT NULL DEFAULT 1.0;
