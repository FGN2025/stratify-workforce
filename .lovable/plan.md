

## Add Construction & Mechanic Stats to Work Orders Hero

### Changes

**`src/pages/WorkOrders.tsx`**

1. Add two filtered arrays alongside `atsWorkOrders` and `farmingWorkOrders` (~line 102):
   ```ts
   const constructionWorkOrders = filteredWorkOrders.filter(wo => wo.game_title === 'Construction_Sim');
   const mechanicWorkOrders = filteredWorkOrders.filter(wo => wo.game_title === 'Mechanic_Sim');
   ```

2. Extend the `stats` array in the `PageHero` component (~line 142-146) to include the two new categories:
   ```ts
   stats={[
     { value: `${allWorkOrders.length}`, label: 'Active Orders', highlight: true },
     { value: `${atsWorkOrders.length}`, label: 'Trucking' },
     { value: `${farmingWorkOrders.length}`, label: 'Farming' },
     { value: `${constructionWorkOrders.length}`, label: 'Construction' },
     { value: `${mechanicWorkOrders.length}`, label: 'Mechanic' },
   ]}
   ```

Single file, ~4 lines added.

