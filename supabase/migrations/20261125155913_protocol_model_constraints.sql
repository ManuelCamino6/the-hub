
begin;

alter table protocol.columns
  add column if not exists description text;

alter table protocol.tables
  add constraint safe_materialized_table_name
  check (
    char_length(name) <= 59
    and name !~ '_ref$'
  );

alter table protocol.columns
  add constraint safe_model_column_name
  check (
    name not in (
      'id',
      'project_id',
      'created_at',
      'deleted_at',
      'ref_id',
      'global_ref',
      'instance_id',
      'client_operation_id',
      'change_id',
      'tableoid',
      'xmin',
      'xmax',
      'cmin',
      'cmax',
      'ctid'
    )
  );

commit;
