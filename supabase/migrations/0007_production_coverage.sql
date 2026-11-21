-- Harvest coverage per farm and method, used to decide whether a seasonal view is meaningful.
create view production_coverage with (security_invoker = true) as
select farm_id, method,
  min(harvest_date) as first_date,
  max(harvest_date) as last_date,
  (count(distinct extract(month from harvest_date)))::int as cal_months
from harvests
group by farm_id, method;
