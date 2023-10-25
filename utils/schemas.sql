/* This file is just for reference and storage, does not get used by the expo app actually */
/* oh no this only works in postgres not sqlite.. maybe just do client-side ID generation then? */
CREATE SEQUENCE BlockIdSequence bit_reversed_positive;
CREATE SEQUENCE CollectionIdSequence bit_reversed_positive;

CREATE TABLE IF NOT EXISTS blocks (
    id bigint DEFAULT nextval('BlockIdSequence'),
    title varchar(128) NOT NULL,
    content TEXT NOT NULL,
    description TEXT,
    type varchar(128) NOT NULL,
    source TEXT,
    remote_source_type varchar(128),
    remote_source_info blob, # json encoded
    created_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,

    PRIMARY KEY (id),
    FOREIGN KEY (remote_source_type) REFERENCES remote_sources(name),
    FOREIGN KEY (created_by) REFERENCES users(did)
);

CREATE TABLE IF NOT EXISTS collections (
    id bigint DEFAULT nextval('CollectionIdSequence'),
    title varchar(128) NOT NULL,
    description TEXT,
    created_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    remote_source_type varchar(128),
    remote_source_info blob, # json encoded

    PRIMARY KEY (id),
    FOREIGN KEY (created_by) REFERENCES users(did)
);

CREATE TABLE IF NOT EXISTS collection_collaborators (
    collection_id bigint NOT NULL,
    user_id TEXT NOT NULL,
    created_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (collection_id, user_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id),
    FOREIGN KEY (user_id) REFERENCES users(did)
);

CREATE TABLE IF NOT EXISTS remote_sources (
    name varchar(128) NOT NULL,
    url TEXT NOT NULL,
    
    PRIMARY KEY (name)
);

CREATE TABLE IF NOT EXISTS users(
    did TEXT NOT NULL,
    handle varchar(128) NOT NULL,
    name varchar(512) NOT NULL,
    email varchar(512) NOT NULL,
    created_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (did)
);

CREATE TABLE IF NOT EXISTS connections(
    block_id bigint NOT NULL,
    collection_id bigint NOT NULL,
    created_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,

    PRIMARY KEY (block_id, collection_id),
    FOREIGN KEY (block_id) REFERENCES blocks(id),
    FOREIGN KEY (collection_id) REFERENCES collections(id)
);
